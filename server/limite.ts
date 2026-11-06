// Anti-spam tout simple : au plus `max` actions par `fenetre` ms et par adresse IP.
export function limiteur(max: number, fenetre: number) {
  const historique = new Map<string, number[]>()
  return (ip: string | undefined): boolean => {
    const cle = ip ?? '?'
    const maintenant = Date.now()
    const recents = (historique.get(cle) ?? []).filter((t) => maintenant - t < fenetre)
    recents.push(maintenant)
    historique.set(cle, recents)
    return recents.length > max // true = trop d'envois
  }
}
