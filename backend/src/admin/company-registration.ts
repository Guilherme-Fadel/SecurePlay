import {
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { isEmail } from 'class-validator';
import { EntityManager, QueryFailedError } from 'typeorm';
import { CompanyRegistration } from './entities/company-registration.entity';
import { AdminAuditEvent } from './entities/admin-audit-event.entity';

export const registrationLimits = {
  razao_social: 180,
  cnpj: 14,
  unidade: 100,
  contato_nome: 100,
  contato_email: 100,
  contato_telefone: 16,
  cep: 8,
  logradouro: 180,
  numero: 20,
  complemento: 100,
  bairro: 100,
  cidade: 100,
  uf: 2,
} as const;
export type RegistrationField = keyof typeof registrationLimits;
export type RegistrationData = Record<RegistrationField, string | null>;
export const requiredRegistrationFields: RegistrationField[] = [
  'razao_social',
  'cnpj',
  'unidade',
  'contato_nome',
  'contato_email',
  'cep',
  'logradouro',
  'numero',
  'bairro',
  'cidade',
  'uf',
];
export const emptyRegistration = (): RegistrationData =>
  Object.fromEntries(
    Object.keys(registrationLimits).map((key) => [key, null]),
  ) as RegistrationData;

export function normalizeCnpj(value: string) {
  return value.replace(/[./\s-]/g, '').toUpperCase();
}

// Receita Federal: ASCII - 48, pesos 2..9 da direita para a esquerda, módulo 11.
export function validCnpj(value: string) {
  const cnpj = normalizeCnpj(value);
  if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj))
    return false;
  const digit = (base: string) => {
    let sum = 0;
    for (
      let i = base.length - 1, weight = 2;
      i >= 0;
      i--, weight = weight === 9 ? 2 : weight + 1
    )
      sum += (base.charCodeAt(i) - 48) * weight;
    const rest = sum % 11;
    return rest < 2 ? '0' : String(11 - rest);
  };
  return (
    digit(cnpj.slice(0, 12)) === cnpj[12] &&
    digit(cnpj.slice(0, 13)) === cnpj[13]
  );
}

export function normalizeRegistration(
  input: Partial<RegistrationData>,
  complete = false,
): Partial<RegistrationData> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new BadRequestException('Informe os dados cadastrais da empresa');
  const result: Partial<RegistrationData> = {};
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(registrationLimits, key))
      throw new BadRequestException('Campo cadastral desconhecido');
    const field = key as RegistrationField;
    const raw = input[field];
    if (raw === undefined) continue;
    if (raw !== null && typeof raw !== 'string')
      throw new BadRequestException(`Campo inválido: ${field}`);
    let value = raw?.trim().replace(/\s+/g, ' ') || null;
    if (value && field === 'cnpj') value = normalizeCnpj(value);
    if (value && field === 'cep') value = value.replace(/[-\s]/g, '');
    if (value && field === 'uf') value = value.toUpperCase();
    if (value && field === 'contato_email') value = value.toLowerCase();
    if (value && field === 'contato_telefone')
      value = value.replace(/[()\s.-]/g, '');
    if (value && value.length > registrationLimits[field])
      throw new BadRequestException(`Limite excedido: ${field}`);
    result[field] = value;
  }
  if (result.cnpj && !validCnpj(result.cnpj))
    throw new BadRequestException(
      'CNPJ inválido. Confira o número e os dígitos verificadores',
    );
  if (result.cep && !/^\d{8}$/.test(result.cep))
    throw new BadRequestException('Informe um CEP com 8 números');
  if (
    result.uf &&
    !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(
      result.uf,
    )
  )
    throw new BadRequestException('Selecione uma UF válida');
  if (result.contato_email && !isEmail(result.contato_email))
    throw new BadRequestException('E-mail de contato inválido');
  if (result.contato_telefone && !/^\+?\d{8,15}$/.test(result.contato_telefone))
    throw new BadRequestException('Telefone de contato inválido');
  if (complete && requiredRegistrationFields.some((field) => !result[field]))
    throw new BadRequestException(
      'Preencha identificação, contato e endereço da empresa',
    );
  return result;
}

export async function saveRegistration(
  manager: EntityManager,
  empresaId: number,
  actorId: number,
  patch: Partial<RegistrationData> | undefined,
  oldName?: string,
  newName?: string,
) {
  let saved: RegistrationData | undefined;
  const changed: string[] =
    oldName !== undefined && newName !== undefined && oldName !== newName
      ? ['nome']
      : [];
  if (patch !== undefined) {
    const values = normalizeRegistration(patch);
    const repository = manager.getRepository(CompanyRegistration);
    const previous = await repository.findOne({
      where: { empresa_id: empresaId },
    });
    const next = {
      ...emptyRegistration(),
      ...previous,
      ...values,
      empresa_id: empresaId,
    };
    saved = emptyRegistration();
    for (const field of Object.keys(saved) as RegistrationField[])
      saved[field] = next[field];
    if (next.cnpj && !next.unidade)
      throw new BadRequestException(
        'Informe a identificação da unidade para este CNPJ',
      );
    if (next.cnpj && next.unidade) {
      const duplicate = await repository.findOne({
        where: { cnpj: next.cnpj, unidade: next.unidade },
      });
      if (duplicate && duplicate.empresa_id !== empresaId)
        throw new ConflictException(
          'Já existe uma unidade com este CNPJ e identificação',
        );
    }
    for (const field of Object.keys(values) as RegistrationField[])
      if ((previous?.[field] ?? null) !== values[field]) changed.push(field);
    if (changed.some((field) => field !== 'nome'))
      await repository.save(repository.create(next));
  }
  if (changed.length)
    await manager.save(AdminAuditEvent, {
      empresa_id: empresaId,
      ator_id: actorId,
      acao: 'company.registration.updated',
      alvo_tipo: 'empresa',
      alvo_id: empresaId,
      detalhes: { campos_alterados: changed },
    });
  return saved;
}

export function registrationConflict(error: unknown): never {
  const db = error as {
    code?: string;
    driverError?: { code?: string };
    message?: string;
  };
  if (
    (db?.code ?? db?.driverError?.code) === 'ER_DUP_ENTRY' &&
    db?.message?.includes('ux_company_registration_unit')
  )
    throw new ConflictException(
      'Já existe uma unidade com este CNPJ e identificação',
    );
  if (
    error instanceof QueryFailedError ||
    (db?.code ?? db?.driverError?.code)?.startsWith('ER_')
  )
    throw new ServiceUnavailableException(
      'Não foi possível salvar os dados cadastrais. Tente novamente',
    );
  throw error;
}
