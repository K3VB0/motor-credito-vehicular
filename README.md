# Motor de Credito Vehicular

Aplicacion web de simulacion de credito vehicular.

El sistema permite registrar clientes y vehiculos, simular un credito vehicular en Peru por el metodo frances vencido ordinario y calcular indicadores como VAN, TIR mensual y TCEA.

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

## Comandos

```bash
npm run dev
npm run lint
npm run build
```

## Configuracion

Define las variables de Supabase (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`) en un archivo `.env.local`. Sin ellas, la aplicacion funciona en modo demo con datos guardados en el navegador.
