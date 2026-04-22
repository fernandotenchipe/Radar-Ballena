export function translateAnswer(answer?: string): string {
  if (!answer) return "";

  const a = answer.toLowerCase();

  if (a === "yes") return "Sí";
  if (a === "no") return "No";
  if (a === "over") return "Más de";
  if (a === "under") return "Menos de";

  return answer;
}
