import { PetitspasNotFound } from "@/components/petitspas-not-found"
import frMessages from "@/messages/fr.json"

export default function RootNotFoundPage() {
  const copy = frMessages.notFound

  return (
    <PetitspasNotFound
      locale="fr"
      copy={{
        title: copy.title,
        headline: copy.headline,
        description: copy.description,
        backHome: copy.backHome,
        hint: copy.hint,
      }}
    />
  )
}
