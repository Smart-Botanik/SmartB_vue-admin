# Admin Vue (parallel admin)

**Remote:** `git@github.com:The-Lemon-Team/smart-botanik-admin-vuejs.git`  
**Путь в монорепо:** `growing-app/admin-vue/` (nested repo, не submodule)

Параллельная админка на **Vue 3** к существующей React (`admin-frontend`).

## Первичная настройка (монорепо)

```powershell
npm run admin-vue:setup
```

Или клон вручную:

```powershell
git clone git@github.com:The-Lemon-Team/smart-botanik-admin-vuejs.git admin-vue
cd admin-vue
npm install
```

## Запуск

```bash
cd admin-vue
npm install
npm run dev
```

Зависимости ставятся через **Verdaccio** (`registry=http://localhost:4873/`, см. `.npmrc`). Перед `npm install` registry должен быть запущен.

## Commit и push

Только из `admin-vue/` (монорепо папку не коммитит):

```powershell
cd admin-vue
git add .
git commit -m "feat(vue): ..."
git push
# или из корня: npm run admin-vue:push
```

- Vue: http://localhost:5175  
- React: http://localhost:5174 (см. `admin-frontend`)

## Переменные окружения

Скопируйте `.env.example` → `.env`.

| Переменная | Назначение |
|------------|------------|
| `VITE_API_URL` | Nest API (как в React admin) |
| `VITE_ADMIN_REACT_URL` | Базовый URL React admin для меню |
| `VITE_ADMIN_VUE_URL` | Базовый URL Vue admin |

## Авторизация и общий JWT

Ключи `localStorage` совпадают с React (`admin_access_token`, …) — пакет `@growing/admin-shell`.

- **Один origin** (prod за reverse proxy): один вход, токен виден обоим приложениям.
- **Dev, разные порты**: origin разный → отдельный login на каждом порту (допустимо на Phase 1).

## Меню

Секция **Admin React** в сайдбаре Vue — внешние ссылки. В React добавлена секция **Admin Vue (beta)**.

## Документация скоупа

- [`memory/project/story-admin-vue-migration-v1.md`](../memory/project/story-admin-vue-migration-v1.md)
- [`memory/tasks/scopes/admin-vue-migration.md`](../memory/tasks/scopes/admin-vue-migration.md)
