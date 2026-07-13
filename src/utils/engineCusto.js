export function formatarTokens(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  return numero.toLocaleString("pt-BR");
}

export function formatarCustoUsd(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return "—";
  if (numero === 0) return "$0,00";
  return `$${numero.toFixed(numero < 0.01 ? 4 : 2)}`;
}
