# Incubadora - Design Guidelines

Este documento compila as diretrizes visuais e tokens de design extraídos do projeto **Incubadora**, configurado originalmente com **Tailwind CSS v4**. O objetivo deste material é servir como contexto para aplicar a mesma estética (UI/UX) em outros projetos ou ser lido por outros modelos de IA.

## 1. Identidade Visual e Estética (Core Concept)

O projeto utiliza um design **Dark Mode nativo e exclusivo** (não há variante light clara realçada, ambas as definições usam os mesmos tokens escuros). A interface é fortemente baseada no estilo **Glassmorphism** (translucidez, desfoque de fundo e bordas finas semi-transparentes), contrastando fundos escuros do espectro "Zinc" com uma cor primária vibrante (Âmbar/Amarelo).

## 2. Cores (Tokens HSL)

A paleta de cores é estruturada em variáveis CSS que seguem o padrão do Tailwind CSS (compatível com as abordagens de temas como Shadcn UI). As cores são definidas em HSL:

*   **Background**: `240 10% 3.9%` (Fundo principal muito escuro/preto fosco).
*   **Foreground**: `0 0% 98%` (Texto principal quase branco).
*   **Primary / Accent**: `38 92% 50%` (Equivalente ao Amber-500, a cor de destaque principal).
*   **Primary Foreground**: `0 0% 0%` (Texto sobre fundos primários é preto para máximo contraste).
*   **Secondary / Muted / Border / Input**: `240 3.7% 15.9%` (Cinza escuro, usado para limites, áreas inativas e fundos secundários).
*   **Muted Foreground**: `240 5% 64.9%` (Cinza médio, usado para textos descritivos e placeholders).
*   **Destructive**: `0 62.8% 30.6%` (Vermelho escuro/alerta).
*   **Destructive Foreground**: `0 0% 98%` (Branco).

## 3. Tipografia

*   **Fonte Principal**: `Inter` (com fallbacks nativos `system-ui, sans-serif`).
*   **Ajustes**: `antialiased` para suavização, com configurações de font-feature `rlig 1, calt 1`.

## 4. Estrutura e Formas (Bordas e Sombras)

A aplicação abusa de bordas arredondadas e sombras suaves para criar níveis de elevação no ambiente dark.

*   **Raio da Borda Base (`--radius`)**: `0.75rem` (12px).
*   **Raio Médio (`--radius-md`)**: `calc(var(--radius) - 2px)` (10px).
*   **Raio Pequeno (`--radius-sm`)**: `calc(var(--radius) - 4px)` (8px).

## 5. Componentes Globais (Glassmorphism Utilities)

O projeto abstraiu os contêineres principais em duas classes utilitárias no CSS global. Para reproduzir a estética exata da Incubadora, utilize as seguintes classes:

### `.glass-panel`
Utilizado para grandes contêineres, modais ou a base de seções maiores.
> **Tailwind Classes:** `backdrop-blur-xl bg-zinc-900/40 border border-white/10 shadow-xl`

### `.glass-card`
Utilizado para cartões de métricas (KPIs), widgets menores ou itens de lista, contendo interatividade no hover.
> **Tailwind Classes:** `backdrop-blur-md bg-zinc-900/60 border border-white/5 shadow-lg hover:border-white/10 transition-all duration-300`

## 6. Animações e Gráficos

A interface possui micro-interações fluidas configuradas globalmente:

*   **Fade In** (`animate-fade-in`): Aparecimento gradual `0.5s ease-out` de opacidade 0 para 1.
*   **Slide Up** (`animate-slide-up`): Deslocamento leve para cima (`translateY(10px)` para `0`) combinado com Fade In em `0.5s ease-out`.
*   **Gradients Especiais**:
    *   `hero-glow`: `conic-gradient(from 180deg at 50% 50%, #2a2a2a 0deg, #1a1a1a 50%, #2a2a2a 360deg)` - Usado em áreas de destaque ou headers.

## 7. Scrollbar Customizada

A interface embeleza as barras de rolagem nativas para combinar com o tema dark:
*   **Largura/Altura**: `8px`.
*   **Thumb (Barra)**: `bg-zinc-800 rounded-full border border-transparent bg-clip-content` com um estado `hover:bg-zinc-700`.
*   **Track (Fundo)**: Transparente.
