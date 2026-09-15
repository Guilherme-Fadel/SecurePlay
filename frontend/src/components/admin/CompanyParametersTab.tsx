import { SlidersHorizontal } from "lucide-react";
import { COMPANY_GAMES, type CompanyParameters } from "@/config/features";
import { InfoCard } from "@/components/ui/visuals/InfoCard";

export function CompanyParametersTab({
  parameters,
  setParameters,
  canEdit,
  saving,
}: {
  parameters: CompanyParameters | null;
  setParameters: (value: CompanyParameters) => void;
  canEdit: boolean;
  saving: boolean;
}) {
  return (
    <div className="app-page admin-page-content">
      <div className="admin-page-heading">
        <div>
          <span className="admin-page-eyebrow">Parâmetros da empresa</span>
          <h1>Funcionalidades</h1>
          <p>
            {canEdit
              ? "Escolha os recursos disponíveis somente para esta instituição."
              : "Consulte os recursos da instituição. Somente o administrador da plataforma pode alterá-los."}
          </p>
        </div>
      </div>
      {!parameters && <p role="status">Carregando parâmetros…</p>}
      {parameters && (
        <InfoCard raised>
          <InfoCard.Header
            title="Recursos disponíveis"
            subtitle="As permissões também são verificadas pela API."
            icon={SlidersHorizontal}
          />
          <fieldset
            disabled={!canEdit || saving}
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
          >
            <InfoCard.Section className="settings-toggle-list">
              <ParameterToggle
                title="Ranking"
                description="Habilita a classificação e os cards de ranking."
                checked={parameters.rankingEnabled}
                disabled={saving}
                onChange={(value) =>
                  setParameters({ ...parameters, rankingEnabled: value })
                }
              />
              <ParameterToggle
                title="Ranking global"
                description="Permite participar da classificação entre instituições que também habilitaram o escopo global."
                checked={parameters.globalRankingEnabled}
                disabled={saving || !parameters.rankingEnabled}
                onChange={(value) =>
                  setParameters({ ...parameters, globalRankingEnabled: value })
                }
              />
              <ParameterToggle
                title="Conquistas"
                description="Habilita Conquistas, loja e personalização cosmética."
                checked={parameters.achievementsEnabled}
                disabled={saving}
                onChange={(value) =>
                  setParameters({ ...parameters, achievementsEnabled: value })
                }
              />
              {COMPANY_GAMES.map((game) => (
                <ParameterToggle
                  key={game.slug}
                  title={game.label}
                  description="Disponibiliza este jogo para os participantes da empresa."
                  checked={parameters.enabledGames.includes(game.slug)}
                  disabled={saving}
                  onChange={(value) =>
                    setParameters({
                      ...parameters,
                      enabledGames: value
                        ? [...parameters.enabledGames, game.slug]
                        : parameters.enabledGames.filter(
                            (slug) => slug !== game.slug,
                          ),
                    })
                  }
                />
              ))}
            </InfoCard.Section>
          </fieldset>
          <InfoCard.Footer>
            <span>
              Os dados existentes são preservados ao desabilitar um recurso.
            </span>
          </InfoCard.Footer>
        </InfoCard>
      )}
    </div>
  );
}

function ParameterToggle({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="settings-toggle-row">
      <span className="settings-toggle-icon">
        <SlidersHorizontal size={17} />
      </span>
      <span className="settings-toggle-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="settings-switch" aria-hidden="true">
        <i />
      </span>
    </label>
  );
}
