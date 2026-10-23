# Assistente de Dependências CLI

Um assistente interativo de terminal projetado para facilitar o gerenciamento de pacotes em projetos Node.js, React Native e Expo. Ele analisa o ambiente local e gera ou lê um arquivo estruturado `requirements.txt`, separando de forma inteligente as dependências de Produção, Desenvolvimento e os pacotes específicos do ecossistema Expo.

---

## Recursos Principais

* **Separação Automática:** Segmenta dependências em blocos legíveis (`[PRODUCTION]` e `[DEVELOPMENT]`).
* **Suporte Nativo ao Expo:** Detecta automaticamente pacotes Expo/React Native e gerencia suas instalações através do comando otimizado `npx expo install`.
* **Interface Interativa:** Menu visual amigável construído com Inquirer (navegação por setas).
* **Histórico Centralizado:** Registra logs de operações de forma global e oculta na máquina do usuário para não poluir o repositório Git do projeto.

---

## Como Executar

A forma mais rápida e recomendada de utilizar este assistente em qualquer projeto é através do **NPX**:

```bash
npx @huanjose/reqs-node
```

---

## Menu de Opções

Ao iniciar a ferramenta, você terá acesso às seguintes funcionalidades:

1. **Exportar dependências para "requirements.txt":** Analisa os pacotes instalados no diretório atual e cria o arquivo de mapeamento segmentado.
2. **Ler "requirements.txt" e Instalar tudo:** Abre um submenu onde você pode escolher instalar apenas pacotes de Produção (`npm install`), apenas de Desenvolvimento (`npm install --save-dev`), apenas do Expo (`npx expo install`) ou o ambiente completo.
3. **Limpar histórico de instalação:** Limpa de forma segura o arquivo global de histórico de uso da ferramenta.
4. **Sair do Assistente:** Encerra a execução da CLI.

---

## Formato do Arquivo Gerado

O arquivo `requirements.txt` gerado pelo assistente segue o padrão estruturado abaixo:

```text
[PRODUCTION]
express@4.18.2
expo-status-bar@1.6.0

[DEVELOPMENT]
nodemon@3.0.1
jest@29.6.4
```

---

## Pré-requisitos

* **Node.js** (versão 16 ou superior)
* **NPM** instalado no sistema

## Licença

Este projeto está sob a licença MIT. Veja o arquivo para mais detalhes.
