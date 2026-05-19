import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Benefits } from './benefits.entity';
import { CreateBenefitsDto } from './dto/benefits.dto';
import { ResultadoDto } from 'src/resultado.dto';

@Injectable()
export class BenefitsService {

  constructor(
    @Inject('BENEFITS_REPOSITORY')
    private benefitsRepository: Repository<Benefits>,
  ) {}

  async insertBenefits(data: CreateBenefitsDto): Promise<ResultadoDto>{

    const benefitsExistente = await this.getBenefitsByTitle(data.title)

    if (benefitsExistente){
      throw new ConflictException('Já existe um beneficio com o mesmo Titulo');
    }

    await this.benefitsRepository.save(data)

    return ({
      sucesso: true,
      mensagem: 'Inclusão de registro realizada com sucesso'
    });
  }

  async deleteBenefits(id: number): Promise<ResultadoDto>{

    const result = await this.benefitsRepository.delete(id)

    if (result.affected === 0 ){
      throw new NotFoundException('Benefício não encontrado');
    }

    return ({
      sucesso: true,
      mensagem: 'Exclusão de registro realizada com sucesso'
    });
  }
  

  async getBenefits(id?: number){


    if (id) {
      const item = await this.getBenefitsById(id);

      if (!item) {
        throw new NotFoundException('Benefício não encontrado');
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        icon: item.icon,
        color: item.color,
        textColor: item.textColor,
        borderColor: item.borderColor,
        glow: item.glow
      };
    }

    const items = await this.benefitsRepository.find();

    return items.map((item) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      icon: item.icon,
      color: item.color,
      textColor: item.textColor,
      borderColor: item.borderColor,
      glow: item.glow
    }))

  }


  async getBenefitsById(id: number): Promise<Benefits | undefined>{
    const benefits = await this.benefitsRepository.findOne({ where: { id } })
    return benefits ?? undefined
  }

  async getBenefitsByTitle(title: string): Promise<Benefits | undefined>{
    const benefits = await this.benefitsRepository.findOne({ where: { title } })
    return benefits ?? undefined
  }
}


