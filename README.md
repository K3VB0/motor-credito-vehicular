# Motor de Credito Vehicular

Aplicacion web de simulacion de credito vehicular.

El sistema permite registrar clientes y vehiculos, simular un credito vehicular en Peru por el metodo frances vencido ordinario y calcular indicadores como VAN, TIR mensual y TCEA.

Aplicacion en produccion: https://motor-credito-vehicular.vercel.app

Construida con Next.js (React) y Tailwind CSS; base de datos y autenticacion en Supabase (PostgreSQL); desplegada en Vercel.

## Estructura

```txt
motor-credito-vehicular/
|-- src/
|   |-- app/
|   |   |-- login/
|   |   |-- registro/
|   |   |-- simulador/
|   |   |-- cotizaciones/
|   |   |-- clientes/
|   |   |-- vehiculos/
|   |   |-- layout.js
|   |   |-- page.js
|   |   `-- globals.css
|   |-- components/
|   |-- lib/
|   |   |-- motor-financiero.js
|   |   `-- supabase.js
|   `-- proxy.js
|-- package.json
`-- README.md
```

## Modulos implementados

- Autenticacion: login y registro, con modo demo si Supabase aun no esta configurado.
- Simulador: calculo del credito, cronograma de pagos, VAN, TIR mensual y TCEA,
  con botones de datos de demostracion.
- Cotizaciones: historial de cotizaciones guardadas, con opcion de reabrirlas
  en el simulador o eliminarlas.
- Clientes: alta, edicion y eliminacion, persistidos en Supabase.
- Vehiculos: alta, edicion y eliminacion, persistidos en Supabase.

## Requisitos

- Node.js 18 o superior.

## Ejecucion local

```bash
npm install    # instala las dependencias (solo la primera vez)
npm run dev    # inicia el servidor en http://localhost:3000
```

Otros comandos:

```bash
npm run build  # compila para produccion
npm run lint   # revisa el codigo
```

## Configuracion

Crea un archivo `.env.local` en la raiz con las variables de Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Sin estas variables, la aplicacion funciona en modo demo con datos guardados en el navegador (sin login real ni persistencia).
