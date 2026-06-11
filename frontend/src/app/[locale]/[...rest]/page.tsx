import { notFound } from "next/navigation"

/** Toute URL inconnue sous /fr/… ou /ar/… affiche la page 404 PetitsPas. */
export default function LocaleCatchAllPage() {
  notFound()
}
