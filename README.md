# create-nuxion

Scaffold [Nuxion](https://github.com/hafiznugrahadev/nuxion) — starter kit
monorepo NestJS + Nuxt — menjadi project baru dalam satu perintah:

```bash
bun create nuxion@latest nama-project
```

## Prasyarat

- [Bun](https://bun.sh) ≥ 1.3
- git

## Flags

| Flag               | Default         | Keterangan                               |
| ------------------ | --------------- | ---------------------------------------- |
| `--branch <ref>`   | `main`          | Branch/tag template                      |
| `--repo <url>`     | repo publik     | URL clone alternatif (mis. fork/private) |
| `--display <nama>` | Title Case slug | Nama tampilan aplikasi                   |
| `--no-install`     | —               | Lewati `bun install` di akhir            |
| `-h, --help`       | —               | Bantuan                                  |

## Yang dilakukan

1. Clone shallow dari GitHub → `nama-project/`
2. Buang `.git` lalu `git init` baru **tanpa remote** — tidak ada cara salah
   push ke repo Nuxion, dan riwayat commit kit tidak terbawa
3. Jalankan `scripts/init-project.ts` milik kit: rename `@nuxion/*`, slug,
   dan display name, lalu tulis `.env` dari `.env.example` (JWT_SECRET
   digenerate)
4. Hapus meta-dok kit: `.zcode/`, `docs/`, `LESSON.md`, `MEMORY.md`,
   `ERRORS.md`, `scripts/init-project.*` beserta entry `"init"` di
   `package.json` (SPEC.md, `.github/`, dan `docker/` tetap dipertahankan)
5. `bun install` + commit pertama (`chore: scaffold dari create-nuxion`)

Template diambil langsung dari branch `main` repo Nuxion saat perintah
dijalankan — tidak di-bundle ke paket ini, jadi scaffold selalu memakai
template terbaru dan paket ini hanya perlu di-publish ulang bila CLI-nya
berubah.

## Publish (maintainer)

```bash
npm login          # verifikasi dulu: npm whoami harus mengembalikan username
npm version patch  # atau minor / major
npm publish
npm view create-nuxion   # cek hasil publish
```
