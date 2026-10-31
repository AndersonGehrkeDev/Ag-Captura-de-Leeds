import Image from "next/image";
import { Building2, HeartPulse, Snowflake, Sparkles, Store, Wrench } from "lucide-react";
import type { ProspectCompany } from "../domain/company";

export function CompanyAvatar({ company, large = false }: { company: ProspectCompany; large?: boolean }) {
  const Icon = company.category === "Clínica médica" ? HeartPulse : company.category === "Climatização" ? Snowflake : company.category === "Centro de estética" ? Sparkles : company.category === "Oficina mecânica" ? Wrench : company.category === "Construção civil" ? Building2 : Store;
  return <div className={`company-avatar ${large ? "large" : ""}`}>
    {company.photo ? <Image src={company.photo} alt={large ? "Imagem gerada de estabelecimento fictício" : ""} fill sizes={large ? "335px" : "40px"} className="object-cover" /> : <Icon aria-hidden="true" size={large ? 56 : 21} />}
    {large && <span className="illustration-label">Imagem ilustrativa</span>}
  </div>;
}
