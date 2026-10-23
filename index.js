#!/usr/bin/env node
// SheBang - PATH - Programa
const fs = require('fs');
const path = require('path')
const os = require('os')
const { execSync, exec } = require('child_process');
const inquirer = require('inquirer');

// Cores ANSI nativas para estilização do terminal
const COR = {
    reset: "\x1b[0m",
    verde: "\x1b[32m",
    azul: "\x1b[34m",
    amarelo: "\x1b[33m",
    vermelho: "\x1b[31m",
    ciano: "\x1b[36m",
    bold: "\x1b[1m",
    bgAzul: "\x1b[44m\x1b[37m"
};


const nomeArquivo = path.join(process.cwd(), 'requirements.txt');
const arquivoLog = path.join(os.homedir(), '.historico-freeze.log');

// Função auxiliar para salvar mensagens no arquivo de log
function registrarLog(msg) {
    const dataHora = new Date().toLocaleString('pt-BR');
    if (!fs.existsSync(arquivoLog)) {
        console.log(`\n${COR.verde}Histórico criado em ${arquivoLog} ${COR.reset}`);
    }
    fs.appendFileSync(arquivoLog, `[${dataHora}] ${msg}\n`, 'utf-8');
}


// Função de exportação adaptada para Promise (para que o menu espere o término real)
function exportarDependencias() {
    return new Promise((resolve) => {
        console.log(`\n${COR.ciano}Analisando dependências locais...${COR.reset}`);
        registrarLog('Iniciando exportação de dependências segmentadas...');

        const executarNpmLs = comando => new Promise((resolveComando, rejectComando) => {
            exec(comando, (error, stdout) => {
                if (error) {
                    rejectComando(new Error(`${comando}: ${error.message}`));
                    return;
                }
                resolveComando(stdout);
            });
        });

        Promise.all([
            executarNpmLs('npm ls --production --json'),
            executarNpmLs('npm ls --development --json')
        ]).then(([stdoutProd, stdoutDev]) => {
            try {
                const dependenciasProd = JSON.parse(stdoutProd).dependencies || {};
                const dependenciasDev = JSON.parse(stdoutDev).dependencies || {};
                const nomesProd = new Set(Object.keys(dependenciasProd));
                const prodPacotes = Object.entries(dependenciasProd)
                    .map(([nome, info]) => `${nome}@${info.version}`);
                const devPacotes = Object.entries(dependenciasDev)
                    .filter(([nome]) => !nomesProd.has(nome))
                    .map(([nome, info]) => `${nome}@${info.version}`);

                if (prodPacotes.length === 0 && devPacotes.length === 0) {
                    console.log(`${COR.amarelo}Nenhuma dependência encontrada para exportar.${COR.reset}`);
                    registrarLog('Aviso: Nenhuma dependência encontrada para exportar.');
                    resolve();
                    return;
                }

                let conteudoArquivo = '';
                if (prodPacotes.length > 0) {
                    conteudoArquivo += '[PRODUCTION]\n' + prodPacotes.join('\n') + '\n';
                }
                if (devPacotes.length > 0) {
                    conteudoArquivo += '\n[DEVELOPMENT]\n' + devPacotes.join('\n') + '\n';
                }

                fs.writeFileSync(nomeArquivo, conteudoArquivo.trim(), 'utf-8');

                console.log(`\n${COR.verde}Sucesso! Arquivo "requirements.txt" gerado com separação de ambientes.${COR.reset}`);
                console.log(`${COR.azul}Produção: ${prodPacotes.length}${COR.reset} | ${COR.amarelo}Desenvolvimento: ${devPacotes.length}${COR.reset}\n`);
                registrarLog(`Sucesso: Arquivo "requirements.txt" gerado. (Prod: ${prodPacotes.length}, Dev: ${devPacotes.length})`);
            } catch (e) {
                console.error(`${COR.vermelho}Falha ao processar os dados do npm.${COR.reset}`);
                registrarLog(`Erro no processamento do JSON do npm: ${e.message}`);
            }
            resolve();
        }).catch(error => {
            const erroMsg = `Erro ao ler pacotes: ${error.message}`;
            console.error(`${COR.vermelho}${erroMsg}${COR.reset}`);
            registrarLog(erroMsg);
            resolve();
        });
    });
}


async function processarInstalacao(caminhoValido) {
    console.log(`\n${COR.ciano}Lendo o arquivo "requirements.txt"...${COR.reset}`);
    registrarLog(`Iniciando leitura do arquivo para instalação: ${caminhoValido}`);

    if (!fs.existsSync(caminhoValido)) {
        console.error(`${COR.vermelho}Erro: Arquivo "requirements.txt" não encontrado!${COR.reset}`);
        return;
    }

    const linhas = fs.readFileSync(caminhoValido, 'utf-8')
        .split('\n')
        .map(linha => linha.trim());

    const npmProd = [];
    const npmDev = [];
    const expoProd = [];

    let contextoAtual = 'PRODUCTION';

    linhas.forEach(linha => {
        // garante que a linha é string antes do map interno feito pelo fs
        const textoLinha = String(linha).trim();
        if (!textoLinha) return;

        if (textoLinha === '[PRODUCTION]') {
            contextoAtual = 'PRODUCTION';
            return;
        }
        if (textoLinha === '[DEVELOPMENT]') {
            contextoAtual = 'DEVELOPMENT';
            return;
        }

        const ExpoOuRN = textoLinha.startsWith('expo') || textoLinha.startsWith('@expo/') || textoLinha.includes('react-native');

        if (contextoAtual === 'PRODUCTION') {
            if (ExpoOuRN) expoProd.push(textoLinha);
            else npmProd.push(textoLinha);
        } else {
            npmDev.push(textoLinha);
        }
    });

    const totalPacotes = npmProd.length + npmDev.length + expoProd.length;
    if (totalPacotes === 0) {
        console.log(`${COR.amarelo}Nenhum pacote encontrado dentro do arquivo.${COR.reset}`);
        registrarLog('Aviso: Arquivo vazio ou sem formatos válidos.');
        return;
    }
    registrarLog(`Distribuição de pacotes: NPM Prod: ${npmProd.length} | NPM Dev: ${npmDev.length} | Expo: ${expoProd.length}`);

    try {
        // O await trava o terminal para coletar a resposta do usuário sem conflitar com outros menus
        const respostas = await inquirer.prompt([
            {
                type: 'list',
                name: 'opcao',
                message: 'Quais dependências você deseja instalar?',
                choices: [
                    { name: `Baixar dependências de Produção. ${npmProd.length} dependências`, value: 'PROD' },
                    { name: `Baixar dependências de Desenvolvimento. ${npmDev.length} dependências`, value: 'DEV' },
                    { name: `Baixar dependências Expo. ${expoProd.length} dependências`, value: 'EXPO' },
                    { name: 'Baixar todos os tipos de dependências', value: 'FULL' },
                    { name: 'Cancelar instalação', value: 'CANCELAR' }
                ]
            }
        ]);

        if (respostas.opcao === 'PROD') {
            instalarProd();
            console.log(`\n${COR.verde}${COR.bold}Processo de instalação de dependências de Produção finalizado!${COR.reset}\n\n`);
            registrarLog('Processo de instalação de dependências de produção finalizado..\n---');
        } else if (respostas.opcao === 'DEV') {
            instalarDev();
            console.log(`\n${COR.verde}${COR.bold}Processo de instalação de dependências de Desenvolvimento finalizado!${COR.reset}\n\n`);
            registrarLog('Processo de instalação de dependências de desenvolvimento finalizado.\n---');
        } else if (respostas.opcao === 'EXPO') {
            instalarExpo();
            console.log(`\n${COR.verde}${COR.bold}Processo de instalação de dependências Expo finalizado!${COR.reset}\n\n`);
            registrarLog('Processo de instalação de dependências expo finalizado.\n---');
        } else if (respostas.opcao === 'FULL') {
            instalarProd();
            instalarDev();
            instalarExpo();
            console.log(`\n${COR.verde}${COR.bold}Processo de instalação finalizado com divisão de ambientes!${COR.reset}\n\n`);
            registrarLog('Processo de instalação segmentada finalizado com sucesso.\n---');
        } else {
            console.log(`\n${COR.ciano}Instalação cancelada pelo usuário.${COR.reset}\n`);
        }

    } catch (erro) {
        console.error(`${COR.vermelho}Erro ao processar o menu de instalação: ${erro.message}${COR.reset}`);
    }


    // Instala Dependências de Produção Normais (via npm install)
    function instalarProd() {
        if (npmProd.length > 0) {
            console.log(`\n${COR.azul}Instalando ${npmProd.length} dependências normais de PRODUÇÃO via npm...${COR.reset}`);
            const comando = `npm install ${npmProd.join(' ')}`;
            try {
                console.log(`${COR.bold}🚀 Rodando:${COR.reset} ${COR.ciano}npm install${COR.reset}`);
                execSync(comando, { stdio: 'inherit', cwd: process.cwd() });
            } catch (error) { console.error(`${COR.vermelho}Erro no bloco NPM Prod.${COR.reset}`); }
        }
    }

    function instalarDev() {
        // Instala Dependências de Desenvolvimento (via npm install --save-dev)
        if (npmDev.length > 0) {
            console.log(`\n${COR.amarelo}Instalando ${npmDev.length} ferramentas de DESENVOLVIMENTO via npm...${COR.reset}`);
            const comando = `npm install --save-dev ${npmDev.join(' ')}`;
            try {
                console.log(`${COR.bold}🚀 Rodando:${COR.reset} ${COR.ciano}npm install --save-dev${COR.reset}`);
                execSync(comando, { stdio: 'inherit', cwd: process.cwd() });
            } catch (error) { console.error(`${COR.vermelho}Erro no bloco NPM Dev.${COR.reset}`); }
        }
    }

    function instalarExpo() {
        // Instala Dependências do Expo (via npx expo install)
        if (expoProd.length > 0) {
            console.log(`\n${COR.verde}Otimizando e instalando ${expoProd.length} dependências do Expo...${COR.reset}`);
            const comando = `npx expo install ${expoProd.join(' ')}`;
            try {
                console.log(`${COR.bold}🚀 Rodando:${COR.reset} ${COR.ciano}npx expo install${COR.reset}`);
                execSync(comando, { stdio: 'inherit', cwd: process.cwd() });
            } catch (error) { console.error(`${COR.vermelho}Erro no bloco Expo.${COR.reset}`); }
        }
    }
}

// função para limpar o arquivo historico.log
function limparHistorico() {
    if (!fs.existsSync(arquivoLog) || fs.readFileSync(arquivoLog).toString() === "") {
        console.log(`\n${COR.amarelo}O histórico em ${arquivoLog} já está vazio!${COR.reset}`);
    } else {
        fs.writeFileSync(arquivoLog, "");
        console.log(`\n${COR.verde}Histórico limpo com êxito!${COR.reset}`);
    }
}


// --- RENDERIZAÇÃO DO MENU INTERATIVO ---
async function abrirMenu() {
    try {
        const respostas = await inquirer.prompt([
            {
                type: 'list',
                name: 'opcao',
                message: 'O que você deseja fazer?',
                choices: [
                    { name: `Exportar dependências deste projeto para "requirements.txt"`, value: 'EXPORTAR' },
                    { name: `Ler "requirements.txt" e Instalar tudo (NPM + Expo)`, value: 'IMPORTAR' },
                    { name: 'Limpar histórico de instalação', value: 'LIMPAR' },
                    { name: 'Sair do Assistente', value: 'SAIR' }
                ]
            }]);
        if (respostas.opcao === 'EXPORTAR') {
            await exportarDependencias();
            await abrirMenu();
        } else if (respostas.opcao === 'IMPORTAR') {
            // o await aqui faz o menu principal pausar até processarInstalacao terminar
            await processarInstalacao(nomeArquivo);
            await abrirMenu();
        } else if (respostas.opcao === 'LIMPAR') {
            limparHistorico();
        } else {
            console.log(`\n${COR.verde}Saindo do programa. Até mais!${COR.reset}\n`);
            process.exit(0);
        }
    } catch (error) { console.error('Erro no menu principal:', error); }
}


abrirMenu();