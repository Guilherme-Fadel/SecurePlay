import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getTema, updateTema, presignLogo } from '@/services/admin';
import { EmpresaPaleta } from '@/services/me';
import { DEFAULT_PALETTES } from '@/lib/defaultPalettes';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/contexts/ThemeContext';

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function derivePalette(primaryHex: string): EmpresaPaleta {
  const [h, s, l] = hexToHsl(primaryHex);
  const secondary = hslToHex((h + 180) % 360, Math.min(s, 80), Math.max(l, 40));
  const accent = hslToHex((h + 60) % 360, Math.min(s + 10, 100), Math.min(l + 10, 60));
  const isDark = l < 50;
  return {
    primary: primaryHex,
    secondary,
    accent,
    text_primary: isDark ? '#ECECEC' : '#1E293B',
    text_secondary: isDark ? '#94a3b8' : '#475569',
  };
}

export default function Admin() {
  const { user, loading: userLoading } = useCurrentUser();
  const navigate = useNavigate();
  const [paleta, setPaleta] = useState<EmpresaPaleta>(DEFAULT_PALETTES[0].paleta);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Redirect se não é admin
  useEffect(() => {
    if (!userLoading && user && user.role !== 'admin') {
      navigate('/home');
    }
  }, [user, userLoading, navigate]);

  // Carregar tema atual
  useEffect(() => {
    getTema()
      .then((data) => {
        setEmpresaNome(data.nome);
        if (data.paleta) setPaleta(data.paleta);
        if (data.logo_url) {
          setLogoUrl(data.logo_url);
          setLogoPreview(data.logo_url);
        }
      })
      .catch(() => {
        // Empresa não vinculada — ignora
      });
  }, []);

  const handleColorChange = (field: keyof EmpresaPaleta, value: string) => {
    setPaleta((prev) => ({ ...prev, [field]: value }));
  };

  const handleDerivePalette = (primaryHex: string) => {
    const derived = derivePalette(primaryHex);
    setPaleta(derived);
  };

  const handleSelectPreset = (preset: EmpresaPaleta) => {
    setPaleta({ ...preset });
  };

  const handleReset = () => {
    setPaleta(DEFAULT_PALETTES[0].paleta);
    setMessage('Paleta resetada para o padrão');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validações
    const allowedTypes = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      setMessage('Formato inválido. Use PNG, SVG, WEBP ou JPEG.');
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Arquivo muito grande. Máximo: 2MB.');
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setUploading(true);
    try {
      const { uploadUrl, key } = await presignLogo(file.type);
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });
      // Gerar URL pública — usar a key como referência
      setLogoUrl(key);
      setLogoPreview(URL.createObjectURL(file));
      setMessage('Logo enviado com sucesso');
    } catch {
      setMessage('Erro ao enviar logo');
    } finally {
      setUploading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateTema({ paleta, logo_url: logoUrl || undefined });
      setMessage('Tema salvo com sucesso!');
    } catch {
      setMessage('Erro ao salvar tema');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (userLoading) return null;
  if (!user || user.role !== 'admin') return null;

  return (
    <ThemeProvider>
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--background)', color: 'var(--text-primary)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-5xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 style={{ fontFamily: 'var(--font-family-base)' }}>Administrador</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {empresaNome ? `Empresa: ${empresaNome}` : 'Identidade Visual'}
            </p>
          </div>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
          >
            Voltar
          </button>
        </div>

        {/* Mensagem de feedback */}
        {message && (
          <div
            className="mb-4 px-4 py-2 rounded-lg text-sm"
            style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Coluna esquerda — Configuração */}
          <div className="space-y-6">
            {/* Logo */}
            <section
              className="p-6 rounded-xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h4 className="mb-4" style={{ fontFamily: 'var(--font-family-base)' }}>Logo da empresa</h4>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="w-16 h-16 object-contain rounded-lg"
                    style={{ backgroundColor: 'var(--background)' }}
                  />
                )}
                <label
                  className={cn(
                    'px-4 py-2 rounded-lg cursor-pointer transition-colors text-sm',
                    uploading && 'opacity-50 pointer-events-none'
                  )}
                  style={{ backgroundColor: 'var(--primary)', color: '#fff' }}
                >
                  {uploading ? 'Enviando...' : 'Enviar logo'}
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/webp,image/jpeg"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                PNG, SVG, WEBP ou JPEG. Máximo 2MB.
              </p>
            </section>

            {/* Paletas padrão */}
            <section
              className="p-6 rounded-xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h4 className="mb-4" style={{ fontFamily: 'var(--font-family-base)' }}>Paletas padrão</h4>
              <div className="grid grid-cols-2 gap-3">
                {DEFAULT_PALETTES.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleSelectPreset(preset.paleta)}
                    className="p-3 rounded-lg text-left transition-all hover:scale-[1.02]"
                    style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex gap-1 mb-2">
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.paleta.primary }} />
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.paleta.secondary }} />
                      <div className="w-5 h-5 rounded-full" style={{ backgroundColor: preset.paleta.accent }} />
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {preset.name}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Gerar paleta a partir de cor */}
            <section
              className="p-6 rounded-xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h4 className="mb-4" style={{ fontFamily: 'var(--font-family-base)' }}>Gerar paleta automática</h4>
              <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                Escolha uma cor primária e o sistema gera as cores complementares.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={paleta.primary}
                  onChange={(e) => handleDerivePalette(e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0"
                />
                <span className="text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {paleta.primary}
                </span>
              </div>
            </section>

            {/* Edição manual */}
            <section
              className="p-6 rounded-xl"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h4 className="mb-4" style={{ fontFamily: 'var(--font-family-base)' }}>Edição manual</h4>
              <div className="space-y-3">
                {[
                  { key: 'primary' as const, label: 'Primária' },
                  { key: 'secondary' as const, label: 'Secundária' },
                  { key: 'accent' as const, label: 'Destaque' },
                  { key: 'text_primary' as const, label: 'Texto principal' },
                  { key: 'text_secondary' as const, label: 'Texto secundário' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={paleta[key]}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={paleta[key]}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        className="w-24 px-2 py-1 rounded text-xs font-mono"
                        style={{
                          backgroundColor: 'var(--background)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Coluna direita — Preview */}
          <div className="space-y-6">
            <section
              className="p-6 rounded-xl sticky top-6"
              style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <h4 className="mb-4" style={{ fontFamily: 'var(--font-family-base)' }}>Preview</h4>

              {/* Mini preview da interface */}
              <div
                className="rounded-lg p-4 space-y-4"
                style={{ backgroundColor: paleta.text_primary === '#ECECEC' ? '#1E293B' : '#ffffff' }}
              >
                {/* Header preview */}
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-8 h-8 object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded" style={{ backgroundColor: paleta.primary }} />
                  )}
                  <span className="text-sm font-bold" style={{ color: paleta.text_primary }}>
                    {empresaNome || 'Sua Empresa'}
                  </span>
                </div>

                {/* Botões preview */}
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: paleta.primary }}
                  >
                    Primário
                  </button>
                  <button
                    className="px-3 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: paleta.secondary }}
                  >
                    Secundário
                  </button>
                  <button
                    className="px-3 py-1 rounded text-xs"
                    style={{ backgroundColor: paleta.accent, color: '#1E293B' }}
                  >
                    Destaque
                  </button>
                </div>

                {/* Texto preview */}
                <div>
                  <p className="text-sm" style={{ color: paleta.text_primary }}>Texto principal de exemplo</p>
                  <p className="text-xs" style={{ color: paleta.text_secondary }}>Texto secundário de exemplo</p>
                </div>

                {/* Card preview */}
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: paleta.text_primary === '#ECECEC' ? '#273449' : '#f8fafc',
                    border: `1px solid ${paleta.primary}33`,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: paleta.accent }} />
                    <span className="text-xs" style={{ color: paleta.text_primary }}>Card de exemplo</span>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: `${paleta.primary}33` }}>
                    <div className="h-full rounded-full w-2/3" style={{ backgroundColor: paleta.primary }} />
                  </div>
                </div>
              </div>
            </section>

            {/* Ações */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 rounded-lg text-white transition-opacity"
                style={{ backgroundColor: 'var(--primary)', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Salvando...' : 'Salvar tema'}
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-3 rounded-lg transition-colors"
                style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                Resetar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
    </ThemeProvider>
  );
}
