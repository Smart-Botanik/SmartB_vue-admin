/**
 * Smoke: taxonomy GraphQL (требует Nest + seed + учётные данные admin).
 *
 * Usage:
 *   set SMOKE_ADMIN_IDENTIFIER=admin@example.com
 *   set SMOKE_ADMIN_PASSWORD=...
 *   node scripts/smoke-taxonomy.mjs
 *
 * Optional: API_URL (default http://localhost:3001)
 */
const API_URL = (process.env.API_URL || "http://localhost:3001").replace(/\/+$/, "");
const IDENTIFIER = process.env.SMOKE_ADMIN_IDENTIFIER;
const PASSWORD = process.env.SMOKE_ADMIN_PASSWORD;

async function gql(token, query, variables, operationName) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}/graphql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables, operationName }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join("; "));
  }
  return json.data;
}

async function login() {
  if (!IDENTIFIER || !PASSWORD) {
    throw new Error("Задайте SMOKE_ADMIN_IDENTIFIER и SMOKE_ADMIN_PASSWORD");
  }
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: IDENTIFIER, password: PASSWORD }),
  });
  if (!res.ok) {
    throw new Error(`Login HTTP ${res.status}`);
  }
  const body = await res.json();
  if (!body.jwt) {
    throw new Error("Login: нет jwt в ответе");
  }
  return body.jwt;
}

async function main() {
  console.log(`API: ${API_URL}`);
  const token = await login();
  console.log("Login OK");

  const scopesData = await gql(
    token,
    `query TaxonomyScopes { taxonomyScopes { key label } }`,
    {},
    "TaxonomyScopes",
  );
  const scopes = scopesData.taxonomyScopes;
  console.log(`taxonomyScopes: ${scopes.length} scope(s)`);
  if (scopes.length === 0) {
    throw new Error("Нет scopes — проверьте seed");
  }

  const scopeKey = scopes[0].key;
  const forestData = await gql(
    token,
    `query TaxonomyForest($scopeKey: String!) {
      taxonomyForest(scopeKey: $scopeKey) { id key label children { id key label } }
    }`,
    { scopeKey },
    "TaxonomyForest",
  );
  const forest = forestData.taxonomyForest;
  console.log(`taxonomyForest("${scopeKey}"): ${forest.length} root node(s)`);
  console.log("Smoke taxonomy OK");
}

main().catch((err) => {
  console.error("Smoke failed:", err.message);
  process.exit(1);
});
