import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const admissions = [
  { name: "Amin El Fassi", age: "2 ans", date: "20/10/2025", status: "En revue" as const },
  { name: "Lina Tazi", age: "3 ans", date: "18/10/2025", status: "Accepté" as const },
  { name: "Omar Benjaloum", age: "4 ans", date: "22/10/2025", status: "Attente" as const },
]

const STATUS_VARIANT = {
  "En revue": "review",
  Accepté: "accepted",
  Attente: "neutral",
} as const

export function RecentAdmissions() {
  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <span>🌱</span> Admissions en attente
      </h3>
      <div className="space-y-3">
        {admissions.map((adm, idx) => (
          <div key={idx} className="p-3 bg-muted/30 rounded-lg">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-sm text-foreground">{adm.name}</p>
                <p className="text-xs text-muted-foreground">
                  {adm.age} • {adm.date}
                </p>
              </div>
              <Badge variant={STATUS_VARIANT[adm.status]}>{adm.status}</Badge>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs bg-transparent">
                Voir détails
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
