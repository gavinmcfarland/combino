# Ideas

If any of the path parameter evaluate to false, then the path fails and doesnt get created.

```bash
framework=svelte
src-[framework] → scr-svelte/
scr[framework="svelte"] → scr/

framework=react
scr[framework="svelte"] → empty

typescript=true
index.[typescript?"ts":"js"] → index.ts

region=eu
index.[region="eu"?"eu":"us"].html → index.eu.html

darkMode=dark
theme-[darkMode?"dark":"light"].css  → theme-dark.css

hasDashboard=false
dashboard[hasDashboard?"-admin":""] → dashboard
```

query param style

```bash
framework=svelte
src-[framework] → scr-svelte/
scr[?framework="svelte"] → scr/

framework=react
scr[?framework="svelte"] → empty

typescript=true
index.[?typescript:"ts","js"] → index.ts

region=eu
index.[?region="eu":"eu","us"].html → index.eu.html

darkMode=dark
theme-[?darkMode:"dark","light"].css  → theme-dark.css

hasDashboard=false
dashboard[?hasDashboard:"-admin",""] → dashboard
```
