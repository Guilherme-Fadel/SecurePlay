import { PageTransition } from "./PageTransition"
import { Construction } from "lucide-react"

interface UnderDevelopmentProps {
  section: string
}

export function UnderDevelopment({ section }: UnderDevelopmentProps) {
  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <Construction
          className="animate-pulse"
          size={56}
          color="var(--text-secondary)"
        />
        <h3 style={{ color: "var(--text-primary)" }}>{section}</h3>
        <p style={{ color: "var(--text-secondary)" }}>
          Esta seção está em desenvolvimento
        </p>
      </div>
    </PageTransition>
  )
}
