import { CheckCircle2, CircleAlert, KeyRound } from "lucide-react";
import type { ResourceStatus } from "@/domain/configuration";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const labels = { missing: "Configuração pendente", invalid: "Revisar configuração", present: "Configuração presente" } as const;

export function ResourceCard({ resource }: { resource: ResourceStatus }) {
  const Icon = resource.state === "present" ? CheckCircle2 : resource.state === "invalid" ? CircleAlert : KeyRound;
  return <Card className="min-w-0 gap-4">
    <CardHeader>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold"><Icon aria-hidden="true" size={18} className="shrink-0 text-primary" />{resource.label}</h2>
        <Badge variant="outline" className="max-w-full whitespace-normal text-xs">{labels[resource.state]}</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{resource.purpose}</p>
    </CardHeader>
    <CardContent className="space-y-3">
      <ul aria-label={`Variáveis de ${resource.label}`} className="space-y-2">
        {resource.variables.map((variable) => {
          const issue = resource.issues.find((item) => item.variable === variable);
          return <li key={variable} className="rounded-md border bg-background/50 p-3 text-xs leading-relaxed">
            <code className="break-all text-foreground">{variable}</code>
            <span className="mt-1 block text-muted-foreground">{issue ? issue.reason === "missing" ? "Não informada" : "Formato inválido ou exemplo não substituído" : "Formato validado localmente"}</span>
          </li>;
        })}
      </ul>
      {resource.id !== "app" && <p className="text-xs leading-relaxed text-muted-foreground">{resource.id === "supabase" ? "Auth SSR implementado. Configuração não comprova autorização sobre dados externos." : resource.id === "maps" || resource.id === "places" ? "Google permanece bloqueado para o caso de uso atual. Chaves e flags não liberam esta capacidade." : "Adaptador implementado, dependente de habilitação, cotas e evidências. Variáveis presentes não confirmam acesso ao provedor nem conexão verificada."}</p>}
    </CardContent>
  </Card>;
}
