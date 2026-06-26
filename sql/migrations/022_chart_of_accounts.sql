-- ============================================================
-- Migration 022 — Plano de Contas Profissional (ITG 2002 / CFC)
-- Arquitetura híbrida de alta fidelidade: 5 níveis analíticos
-- Módulos: Ativo, Passivo+PL, Receitas, Despesas, Compensação
-- ============================================================

-- ── 1. TABELA PRINCIPAL ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry_id    uuid        NOT NULL REFERENCES public.ministries(id) ON DELETE CASCADE,
  parent_id      uuid        REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
  code           VARCHAR(20) NOT NULL,
  name           text        NOT NULL,
  type           text        NOT NULL CHECK (type IN (
                   'asset',          -- Ativo
                   'liability',      -- Passivo
                   'equity',         -- Patrimônio Líquido
                   'revenue',        -- Receitas
                   'expense',        -- Despesas
                   'compensation'    -- Compensação Extracontábil
                 )),
  nature         text        NOT NULL CHECK (nature IN ('debit', 'credit')),
  account_level  integer     NOT NULL CHECK (account_level BETWEEN 1 AND 5),
  is_analytical  boolean     NOT NULL DEFAULT false,  -- só analíticas recebem lançamentos
  is_active      boolean     NOT NULL DEFAULT true,
  ordem          integer     NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ministry_id, code)
);

COMMENT ON TABLE public.chart_of_accounts IS
  'Plano de contas profissional ITG 2002/CFC. 5 níveis. Separado de fin_categories (operacional).';

-- Linkar fin_categories ao plano de contas (opcional, para mapeamento contábil)
ALTER TABLE public.fin_categories
  ADD COLUMN IF NOT EXISTS chart_account_id uuid
    REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

-- ── 2. TRIGGER updated_at ─────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at_coa()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_coa_updated_at ON public.chart_of_accounts;
CREATE TRIGGER trg_coa_updated_at
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at_coa();

-- ── 3. RLS ────────────────────────────────────────────────────

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coa_select" ON public.chart_of_accounts
  FOR SELECT USING (ministry_id = ANY(get_user_ministry_ids()));

CREATE POLICY "coa_insert" ON public.chart_of_accounts
  FOR INSERT WITH CHECK (
    ministry_id = ANY(get_user_ministry_ids())
    AND get_user_level(ministry_id) <= 2
  );

CREATE POLICY "coa_update" ON public.chart_of_accounts
  FOR UPDATE USING (
    ministry_id = ANY(get_user_ministry_ids())
    AND get_user_level(ministry_id) <= 2
  );

-- Super master pode tudo
CREATE POLICY "coa_super_master" ON public.chart_of_accounts
  USING (is_super_master());

-- ── 4. SEED — Ministério Madureira Piracicaba ─────────────────

DO $$
DECLARE
  m_id uuid := '00000001-0000-0000-0000-000000000001';
BEGIN

-- Tabela temporária (descartada ao final do bloco)
CREATE TEMP TABLE tmp_coa (
  code         text,
  name         text,
  type         text,
  nature       text,
  lvl          integer,
  is_anal      boolean,
  parent_code  text
) ON COMMIT DROP;

-- ══════════════════════════════════════════════════════════════
-- MÓDULO 1: ATIVO (asset / debit)
-- ══════════════════════════════════════════════════════════════
INSERT INTO tmp_coa VALUES
('1',             'ATIVO',                                        'asset','debit',1,false,NULL),
('1.1',           'Ativo Circulante',                             'asset','debit',2,false,'1'),
('1.1.1',         'Disponibilidades (Caixa e Equivalentes)',      'asset','debit',3,false,'1.1'),
('1.1.1.01',      'Recursos Sem Restrição (Livres)',              'asset','debit',4,false,'1.1.1'),
('1.1.1.01.001',  'Caixa Geral',                                  'asset','debit',5,true ,'1.1.1.01'),
('1.1.1.01.002',  'Caixa - Fundos Menores (Cantina/Deptos)',      'asset','debit',5,true ,'1.1.1.01'),
('1.1.1.01.003',  'Bancos Conta Movimento (Recursos Livres)',     'asset','debit',5,true ,'1.1.1.01'),
('1.1.1.01.004',  'Aplicações Financeiras de Liquidez Imediata', 'asset','debit',5,true ,'1.1.1.01'),
('1.1.1.02',      'Recursos Com Restrição (Vinculados - ITG 2002)','asset','debit',4,false,'1.1.1'),
('1.1.1.02.001',  'Conta Bancária - Fundo de Construção/Reforma', 'asset','debit',5,true ,'1.1.1.02'),
('1.1.1.02.002',  'Conta Bancária - Fundo Missionário',           'asset','debit',5,true ,'1.1.1.02'),
('1.1.1.02.003',  'Conta Bancária - Projetos Assistenciais',      'asset','debit',5,true ,'1.1.1.02'),
('1.1.1.02.004',  'Conta Bancária - Fundo de Veículos/Instrumentos','asset','debit',5,true,'1.1.1.02'),
('1.1.2',         'Direitos e Créditos Realizáveis a Curto Prazo','asset','debit',3,false,'1.1'),
('1.1.2.01',      'Adiantamentos a Empregados e Ministros',       'asset','debit',4,false,'1.1.2'),
('1.1.2.01.001',  'Adiantamentos a Funcionários (Celetistas)',    'asset','debit',5,true ,'1.1.2.01'),
('1.1.2.01.002',  'Adiantamento de Prebenda Pastoral',            'asset','debit',5,true ,'1.1.2.01'),
('1.1.2.01.003',  'Adiantamentos para Missões/Viagens',          'asset','debit',5,true ,'1.1.2.01'),
('1.1.2.02',      'Créditos Diversos e Tributários',             'asset','debit',4,false,'1.1.2'),
('1.1.2.02.001',  'Adiantamentos a Fornecedores',                'asset','debit',5,true ,'1.1.2.02'),
('1.1.2.02.002',  'Impostos a Recuperar/Compensar',              'asset','debit',5,true ,'1.1.2.02'),
('1.1.2.02.003',  'Valores a Receber (Cartões/Boletos em Trânsito)','asset','debit',5,true,'1.1.2.02'),
('1.1.2.02.004',  'Cheques Devolvidos a Receber',                'asset','debit',5,true ,'1.1.2.02'),
('1.1.3',         'Estoques (Uso, Consumo e Venda)',              'asset','debit',3,false,'1.1'),
('1.1.3.01',      'Materiais de Consumo',                        'asset','debit',4,false,'1.1.3'),
('1.1.3.01.001',  'Material de Escritório e Expediente',         'asset','debit',5,true ,'1.1.3.01'),
('1.1.3.01.002',  'Material de Limpeza e Conservação',           'asset','debit',5,true ,'1.1.3.01'),
('1.1.3.02',      'Materiais para Distribuição ou Venda',        'asset','debit',4,false,'1.1.3'),
('1.1.3.02.001',  'Literatura, Bíblias e Livros',                'asset','debit',5,true ,'1.1.3.02'),
('1.1.3.02.002',  'Estoque de Cantina / Bazar / Lanchonete',     'asset','debit',5,true ,'1.1.3.02'),
('1.1.4',         'Despesas Antecipadas',                        'asset','debit',3,false,'1.1'),
('1.1.4.01',      'Apropriações a Vencer',                       'asset','debit',4,false,'1.1.4'),
('1.1.4.01.001',  'Prêmios de Seguros a Apropriar',              'asset','debit',5,true ,'1.1.4.01'),
('1.1.4.01.002',  'Assinaturas, Licenças e Anuidades a Apropriar','asset','debit',5,true ,'1.1.4.01'),
('1.2',           'Ativo Não Circulante',                        'asset','debit',2,false,'1'),
('1.2.1',         'Realizável a Longo Prazo',                    'asset','debit',3,false,'1.2'),
('1.2.1.01',      'Direitos de Longo Prazo',                     'asset','debit',4,false,'1.2.1'),
('1.2.1.01.001',  'Depósitos Judiciais',                         'asset','debit',5,true ,'1.2.1.01'),
('1.2.1.01.002',  'Empréstimos Concedidos a Longo Prazo',        'asset','debit',5,true ,'1.2.1.01'),
('1.2.2',         'Imobilizado (Bens Tangíveis Operacionais)',    'asset','debit',3,false,'1.2'),
('1.2.2.01',      'Bens Imóveis',                                'asset','debit',4,false,'1.2.2'),
('1.2.2.01.001',  'Terrenos e Glebas',                           'asset','debit',5,true ,'1.2.2.01'),
('1.2.2.01.002',  'Edificações (Templos, Congregações, Casa Pastoral)','asset','debit',5,true,'1.2.2.01'),
('1.2.2.01.003',  'Instalações Prediais',                        'asset','debit',5,true ,'1.2.2.01'),
('1.2.2.02',      'Bens Móveis e Equipamentos',                  'asset','debit',4,false,'1.2.2'),
('1.2.2.02.001',  'Móveis e Utensílios (Bancos, Cadeiras, Púlpito)','asset','debit',5,true,'1.2.2.02'),
('1.2.2.02.002',  'Máquinas e Equipamentos de Climatização/Geradores','asset','debit',5,true,'1.2.2.02'),
('1.2.2.02.003',  'Equipamentos de Áudio, Vídeo e Iluminação',   'asset','debit',5,true ,'1.2.2.02'),
('1.2.2.02.004',  'Instrumentos Musicais',                       'asset','debit',5,true ,'1.2.2.02'),
('1.2.2.02.005',  'Equipamentos de Informática (Computadores, Projetores)','asset','debit',5,true,'1.2.2.02'),
('1.2.2.03',      'Veículos',                                    'asset','debit',4,false,'1.2.2'),
('1.2.2.03.001',  'Veículos Automotores',                        'asset','debit',5,true ,'1.2.2.03'),
('1.2.2.09',      'Depreciação Acumulada (Contas Redutoras)',     'asset','credit',4,false,'1.2.2'),
('1.2.2.09.001',  '(-) Depreciação de Edificações e Instalações','asset','credit',5,true ,'1.2.2.09'),
('1.2.2.09.002',  '(-) Depreciação de Móveis e Equipamentos',    'asset','credit',5,true ,'1.2.2.09'),
('1.2.2.09.003',  '(-) Depreciação de Áudio, Vídeo e Informática','asset','credit',5,true,'1.2.2.09'),
('1.2.2.09.004',  '(-) Depreciação de Veículos',                 'asset','credit',5,true ,'1.2.2.09'),
('1.2.3',         'Intangível',                                  'asset','debit',3,false,'1.2'),
('1.2.3.01',      'Bens Intangíveis',                            'asset','debit',4,false,'1.2.3'),
('1.2.3.01.001',  'Marcas e Patentes',                           'asset','debit',5,true ,'1.2.3.01'),
('1.2.3.01.002',  'Softwares e Sistemas (Licenças Perpétuas)',    'asset','debit',5,true ,'1.2.3.01'),
('1.2.3.09',      'Amortização Acumulada (Conta Redutora)',       'asset','credit',4,false,'1.2.3'),
('1.2.3.09.001',  '(-) Amortização Acumulada de Intangíveis',    'asset','credit',5,true ,'1.2.3.09');

-- ══════════════════════════════════════════════════════════════
-- MÓDULO 2: PASSIVO E PATRIMÔNIO LÍQUIDO
-- ══════════════════════════════════════════════════════════════
INSERT INTO tmp_coa VALUES
('2',             'PASSIVO E PATRIMÔNIO LÍQUIDO',                  'liability','credit',1,false,NULL),
('2.1',           'Passivo Circulante',                            'liability','credit',2,false,'2'),
('2.1.1',         'Fornecedores e Contas a Pagar',                 'liability','credit',3,false,'2.1'),
('2.1.1.01',      'Fornecedores Nacionais',                        'liability','credit',4,false,'2.1.1'),
('2.1.1.01.001',  'Fornecedores de Materiais e Equipamentos',      'liability','credit',5,true,'2.1.1.01'),
('2.1.1.01.002',  'Fornecedores de Serviços de Terceiros',         'liability','credit',5,true,'2.1.1.01'),
('2.1.1.02',      'Contas de Consumo a Pagar',                     'liability','credit',4,false,'2.1.1'),
('2.1.1.02.001',  'Concessionárias de Energia Elétrica',           'liability','credit',5,true,'2.1.1.02'),
('2.1.1.02.002',  'Concessionárias de Água e Esgoto',              'liability','credit',5,true,'2.1.1.02'),
('2.1.1.02.003',  'Prestadores de Telefonia / Internet / Nuvem',   'liability','credit',5,true,'2.1.1.02'),
('2.1.1.03',      'Aluguéis e Taxas Locatícias',                   'liability','credit',4,false,'2.1.1'),
('2.1.1.03.001',  'Aluguéis de Templos e Congregações a Pagar',    'liability','credit',5,true,'2.1.1.03'),
('2.1.1.03.002',  'Condomínios de Imóveis Locados',                'liability','credit',5,true,'2.1.1.03'),
('2.1.2',         'Obrigações Trabalhistas, Prev. e Ministeriais', 'liability','credit',3,false,'2.1'),
('2.1.2.01',      'Obrigações com Empregados Celetistas (CLT)',    'liability','credit',4,false,'2.1.2'),
('2.1.2.01.001',  'Salários e Ordenados a Pagar',                  'liability','credit',5,true,'2.1.2.01'),
('2.1.2.01.002',  'Provisão de Férias e Encargos',                 'liability','credit',5,true,'2.1.2.01'),
('2.1.2.01.003',  'Provisão de 13º Salário e Encargos',            'liability','credit',5,true,'2.1.2.01'),
('2.1.2.02',      'Obrigações com Liderança Religiosa (Ministros)','liability','credit',4,false,'2.1.2'),
('2.1.2.02.001',  'Prebenda / Côngrua Pastoral a Pagar',           'liability','credit',5,true,'2.1.2.02'),
('2.1.2.02.002',  'Auxílio Moradia / Aluguel Pastoral a Pagar',    'liability','credit',5,true,'2.1.2.02'),
('2.1.2.02.003',  'Auxílio Educação (Dependentes de Pastores)',     'liability','credit',5,true,'2.1.2.02'),
('2.1.2.02.004',  'Fundo de Jubilação / Previdência Pastoral',     'liability','credit',5,true,'2.1.2.02'),
('2.1.2.03',      'Encargos Previdenciários e Sociais a Recolher', 'liability','credit',4,false,'2.1.2'),
('2.1.2.03.001',  'INSS a Recolher - Segurados (Retido)',          'liability','credit',5,true,'2.1.2.03'),
('2.1.2.03.002',  'INSS Patronal a Recolher',                      'liability','credit',5,true,'2.1.2.03'),
('2.1.2.03.003',  'FGTS a Recolher s/ Folha de Pagamento',         'liability','credit',5,true,'2.1.2.03'),
('2.1.3',         'Obrigações Tributárias Próprias e Retidas',     'liability','credit',3,false,'2.1'),
('2.1.3.01',      'Impostos Retidos na Fonte',                     'liability','credit',4,false,'2.1.3'),
('2.1.3.01.001',  'IRRF s/ Folha de Empregados a Recolher',        'liability','credit',5,true,'2.1.3.01'),
('2.1.3.01.002',  'IRRF s/ Sustento Pastoral (Prebendas)',          'liability','credit',5,true,'2.1.3.01'),
('2.1.3.01.003',  'ISSQN Retido na Fonte (Serviços Tomados)',       'liability','credit',5,true,'2.1.3.01'),
('2.1.3.02',      'Contribuições Incidentes',                      'liability','credit',4,false,'2.1.3'),
('2.1.3.02.001',  'PIS sobre Folha de Pagamento a Recolher',        'liability','credit',5,true,'2.1.3.02'),
('2.1.4',         'Recursos Vinculados e Obrigações Denominacionais','liability','credit',3,false,'2.1'),
('2.1.4.01',      'Subvenções e Doações Contratuais com Restrição', 'liability','credit',4,false,'2.1.4'),
('2.1.4.01.001',  'Doações com Restrição a Apropriar',              'liability','credit',5,true,'2.1.4.01'),
('2.1.4.01.002',  'Valores Destinados a Proj. de Assistência Social','liability','credit',5,true,'2.1.4.01'),
('2.1.4.02',      'Repasses e Obrigações Institucionais',          'liability','credit',4,false,'2.1.4'),
('2.1.4.02.001',  'Repasses a Convenções / Sínodos / Conselhos',   'liability','credit',5,true,'2.1.4.02'),
('2.1.4.02.002',  'Dízimos dos Dízimos a Repassar',                'liability','credit',5,true,'2.1.4.02'),
('2.1.4.03',      'Financiamentos de Curto Prazo',                 'liability','credit',4,false,'2.1.4'),
('2.1.4.03.001',  'Empréstimos e Financiamentos - Parcela CP',     'liability','credit',5,true,'2.1.4.03'),
('2.2',           'Passivo Não Circulante',                        'liability','credit',2,false,'2'),
('2.2.1',         'Exigível a Longo Prazo',                        'liability','credit',3,false,'2.2'),
('2.2.1.01',      'Financiamentos de Longo Prazo',                 'liability','credit',4,false,'2.2.1'),
('2.2.1.01.001',  'Financiamentos Imobiliários (Templos/Terrenos)', 'liability','credit',5,true,'2.2.1.01'),
('2.2.1.01.002',  'Financiamentos de Veículos',                    'liability','credit',5,true,'2.2.1.01'),
('2.2.1.02',      'Parcelamentos de Débitos Fiscais',              'liability','credit',4,false,'2.2.1'),
('2.2.1.02.001',  'Parcelamentos Especiais (REFIS / Previdenciário)','liability','credit',5,true,'2.2.1.02'),
('2.2.1.03',      'Provisões para Contingências',                  'liability','credit',4,false,'2.2.1'),
('2.2.1.03.001',  'Provisão para Contingências Trabalhistas',      'liability','credit',5,true,'2.2.1.03'),
('2.2.1.03.002',  'Provisão para Contingências Cíveis e Imobiliárias','liability','credit',5,true,'2.2.1.03'),
('2.3',           'Patrimônio Líquido / Patrimônio Social',        'equity','credit',2,false,'2'),
('2.3.1',         'Fundo Patrimonial Institucional',               'equity','credit',3,false,'2.3'),
('2.3.1.01',      'Patrimônio Social',                             'equity','credit',4,false,'2.3.1'),
('2.3.1.01.001',  'Patrimônio Social - Saldo Inicial de Constituição','equity','credit',5,true,'2.3.1.01'),
('2.3.1.02',      'Reservas de Recursos',                          'equity','credit',4,false,'2.3.1'),
('2.3.1.02.001',  'Fundo de Reserva Estatutária',                  'equity','credit',5,true,'2.3.1.02'),
('2.3.2',         'Superávits ou Déficits Acumulados (ITG 2002)',   'equity','credit',3,false,'2.3'),
('2.3.2.01',      'Resultados Acumulados Sem Restrição (Livres)',   'equity','credit',4,false,'2.3.2'),
('2.3.2.01.001',  'Superávits Acumulados - Recursos Livres',        'equity','credit',5,true,'2.3.2.01'),
('2.3.2.01.002',  '(-) Déficits Acumulados - Recursos Livres',     'equity','debit',5,true,'2.3.2.01'),
('2.3.2.02',      'Resultados Acumulados Com Restrição (Vinculados)','equity','credit',4,false,'2.3.2'),
('2.3.2.02.001',  'Superávits Acumulados - Fundos de Construção e Missões','equity','credit',5,true,'2.3.2.02'),
('2.3.2.02.002',  '(-) Déficits Acumulados - Fundos com Restrição','equity','debit',5,true,'2.3.2.02'),
('2.3.2.03',      'Retificações Contábeis',                        'equity','credit',4,false,'2.3.2'),
('2.3.2.03.001',  'Ajustes de Exercícios Anteriores',              'equity','credit',5,true,'2.3.2.03'),
('2.3.3',         'Resultado do Período Corrente',                  'equity','credit',3,false,'2.3'),
('2.3.3.01',      'Apuração de Resultado do Exercício',            'equity','credit',4,false,'2.3.3'),
('2.3.3.01.001',  'Apuração do Superávit/Déficit do Exercício',    'equity','credit',5,true,'2.3.3.01');

-- ══════════════════════════════════════════════════════════════
-- MÓDULO 3: RECEITAS (revenue / credit)
-- ══════════════════════════════════════════════════════════════
INSERT INTO tmp_coa VALUES
('3',             'RECEITAS (Variações Patrimoniais Aumentativas)', 'revenue','credit',1,false,NULL),
('3.1',           'Receitas com Recursos Sem Restrição (Livres)',   'revenue','credit',2,false,'3'),
('3.1.1',         'Contribuições Ordinárias e Manutenção',          'revenue','credit',3,false,'3.1'),
('3.1.1.01',      'Arrecadação Geral da Igreja',                    'revenue','credit',4,false,'3.1.1'),
('3.1.1.01.001',  'Arrecadação de Dízimos',                         'revenue','credit',5,true,'3.1.1.01'),
('3.1.1.01.002',  'Ofertas de Cultos e Reuniões',                   'revenue','credit',5,true,'3.1.1.01'),
('3.1.1.01.003',  'Votos e Propósitos',                             'revenue','credit',5,true,'3.1.1.01'),
('3.1.1.01.004',  'Doações Espontâneas (PF e PJ)',                  'revenue','credit',5,true,'3.1.1.01'),
('3.1.2',         'Receitas de Departamentos e Eventos',            'revenue','credit',3,false,'3.1'),
('3.1.2.01',      'Eventos e Congressos',                           'revenue','credit',4,false,'3.1.2'),
('3.1.2.01.001',  'Arrecadação com Congressos e Seminários',        'revenue','credit',5,true,'3.1.2.01'),
('3.1.2.01.002',  'Arrecadação com Retiros e Acampamentos',         'revenue','credit',5,true,'3.1.2.01'),
('3.1.2.01.003',  'Festivais, Jantares e Almoços Comunitários',     'revenue','credit',5,true,'3.1.2.01'),
('3.1.3',         'Receitas de Atividades Geradoras de Renda',      'revenue','credit',3,false,'3.1'),
('3.1.3.01',      'Cantina, Livraria e Locações',                   'revenue','credit',4,false,'3.1.3'),
('3.1.3.01.001',  'Receitas de Cantina / Lanchonete',               'revenue','credit',5,true,'3.1.3.01'),
('3.1.3.01.002',  'Receitas de Livraria / Bazar',                   'revenue','credit',5,true,'3.1.3.01'),
('3.1.3.01.003',  'Locação de Espaços (Salão, Quadra)',             'revenue','credit',5,true,'3.1.3.01'),
('3.1.4',         'Receitas Financeiras',                           'revenue','credit',3,false,'3.1'),
('3.1.4.01',      'Rendimentos e Juros',                            'revenue','credit',4,false,'3.1.4'),
('3.1.4.01.001',  'Rendimentos de Aplicações Financeiras',          'revenue','credit',5,true,'3.1.4.01'),
('3.1.4.01.002',  'Juros e Descontos Obtidos',                      'revenue','credit',5,true,'3.1.4.01'),
('3.1.5',         'Receitas de Imunidades e Gratuidades (ITG 2002)','revenue','credit',3,false,'3.1'),
('3.1.5.01',      'Imunidades Tributárias',                         'revenue','credit',4,false,'3.1.5'),
('3.1.5.01.001',  'Receita de Imunidade Tributária - IPTU',         'revenue','credit',5,true,'3.1.5.01'),
('3.1.5.01.002',  'Receita de Imunidade Tributária - IR',           'revenue','credit',5,true,'3.1.5.01'),
('3.1.6',         'Receitas de Trabalho Voluntário (ITG 2002)',     'revenue','credit',3,false,'3.1'),
('3.1.6.01',      'Serviços Voluntários',                           'revenue','credit',4,false,'3.1.6'),
('3.1.6.01.001',  'Receita de Voluntariado - Liderança e Ministério','revenue','credit',5,true,'3.1.6.01'),
('3.1.6.01.002',  'Receita de Voluntariado - Operacional, Música e Adm','revenue','credit',5,true,'3.1.6.01'),
('3.2',           'Receitas com Recursos Com Restrição (Vinculados)','revenue','credit',2,false,'3'),
('3.2.1',         'Arrecadações Direcionadas e Campanhas',          'revenue','credit',3,false,'3.2'),
('3.2.1.01',      'Ofertas Vinculadas a Fundos',                    'revenue','credit',4,false,'3.2.1'),
('3.2.1.01.001',  'Ofertas Direcionadas para Missões',              'revenue','credit',5,true,'3.2.1.01'),
('3.2.1.01.002',  'Ofertas Direcionadas para Ação Social',          'revenue','credit',5,true,'3.2.1.01'),
('3.2.1.01.003',  'Arrecadação para Fundo de Construção e Reformas','revenue','credit',5,true,'3.2.1.01'),
('3.2.1.01.004',  'Arrecadação para Fundo de Veículos/Instrumentos','revenue','credit',5,true,'3.2.1.01'),
('3.2.2',         'Receitas de Trabalho Voluntário Vinculado (ITG 2002)','revenue','credit',3,false,'3.2'),
('3.2.2.01',      'Voluntariado em Projetos Específicos',           'revenue','credit',4,false,'3.2.2'),
('3.2.2.01.001',  'Voluntariado - Projetos Assistenciais',          'revenue','credit',5,true,'3.2.2.01'),
('3.2.2.01.002',  'Voluntariado - Mutirões de Obras e Construções', 'revenue','credit',5,true,'3.2.2.01');

-- ══════════════════════════════════════════════════════════════
-- MÓDULO 4: DESPESAS E CUSTOS (expense / debit)
-- ══════════════════════════════════════════════════════════════
INSERT INTO tmp_coa VALUES
('4',             'DESPESAS E CUSTOS (Variações Patrimoniais Diminutivas)','expense','debit',1,false,NULL),
('4.1',           'Despesas com Atividades-Fim',                    'expense','debit',2,false,'4'),
('4.1.1',         'Liderança Religiosa e Culto (Sustento Pastoral)','expense','debit',3,false,'4.1'),
('4.1.1.01',      'Sustento e Auxílios Pastorais',                  'expense','debit',4,false,'4.1.1'),
('4.1.1.01.001',  'Prebenda Pastoral (Côngrua / Sustento)',         'expense','debit',5,true,'4.1.1.01'),
('4.1.1.01.002',  'Auxílio Moradia / Aluguel Pastoral',             'expense','debit',5,true,'4.1.1.01'),
('4.1.1.01.003',  'Auxílio Educação (Dependentes de Pastores)',     'expense','debit',5,true,'4.1.1.01'),
('4.1.1.01.004',  'Fundo de Jubilação / Previdência Privada Pastoral','expense','debit',5,true,'4.1.1.01'),
('4.1.1.01.005',  'Contribuição Previdenciária Patronal (Pastoral)','expense','debit',5,true,'4.1.1.01'),
('4.1.2',         'Liturgia, Educação Cristã e Departamentos',     'expense','debit',3,false,'4.1'),
('4.1.2.01',      'Despesas Litúrgicas',                           'expense','debit',4,false,'4.1.2'),
('4.1.2.01.001',  'Insumos Litúrgicos e Elementos da Santa Ceia',  'expense','debit',5,true,'4.1.2.01'),
('4.1.2.01.002',  'Ornamentação e Flores',                         'expense','debit',5,true,'4.1.2.01'),
('4.1.2.01.003',  'Manutenção de Instrumentos Musicais',           'expense','debit',5,true,'4.1.2.01'),
('4.1.2.01.004',  'Ajuda de Custo a Pregadores/Cantores Convidados','expense','debit',5,true,'4.1.2.01'),
('4.1.2.02',      'Educação Cristã',                               'expense','debit',4,false,'4.1.2'),
('4.1.2.02.001',  'Material Didático (EBD, Cursos de Teologia)',   'expense','debit',5,true,'4.1.2.02'),
('4.1.2.03',      'Ministérios e Departamentos',                   'expense','debit',4,false,'4.1.2'),
('4.1.2.03.001',  'Despesas com Ministério Infantil',              'expense','debit',5,true,'4.1.2.03'),
('4.1.2.03.002',  'Despesas com Jovens / Adolescentes',            'expense','debit',5,true,'4.1.2.03'),
('4.1.2.03.003',  'Despesas com Ministérios (Casais, Homens, Mulheres)','expense','debit',5,true,'4.1.2.03'),
('4.1.3',         'Evangelismo, Missões e Ação Social',            'expense','debit',3,false,'4.1'),
('4.1.3.01',      'Missões e Evangelismo',                         'expense','debit',4,false,'4.1.3'),
('4.1.3.01.001',  'Sustento de Missionários (Nacional e Transcultural)','expense','debit',5,true,'4.1.3.01'),
('4.1.3.01.002',  'Apoio a Agências Missionárias',                 'expense','debit',5,true,'4.1.3.01'),
('4.1.3.01.003',  'Materiais Evangelísticos (Folhetos, Bíblias para doação)','expense','debit',5,true,'4.1.3.01'),
('4.1.3.02',      'Assistência Social e Beneficência',             'expense','debit',4,false,'4.1.3'),
('4.1.3.02.001',  'Distribuição de Cestas Básicas e Alimentos',    'expense','debit',5,true,'4.1.3.02'),
('4.1.3.02.002',  'Auxílio Financeiro a Membros Carentes',         'expense','debit',5,true,'4.1.3.02'),
('4.1.3.02.003',  'Roupas, Cobertores e Medicamentos',             'expense','debit',5,true,'4.1.3.02'),
('4.1.3.02.004',  'Projetos Sociais Externos (Creches, Asilos)',   'expense','debit',5,true,'4.1.3.02'),
('4.1.4',         'Eventos e Retiros da Comunidade',               'expense','debit',3,false,'4.1'),
('4.1.4.01',      'Despesas com Eventos',                          'expense','debit',4,false,'4.1.4'),
('4.1.4.01.001',  'Locação de Espaços (Conv., Chácaras)',          'expense','debit',5,true,'4.1.4.01'),
('4.1.4.01.002',  'Alimentação em Eventos e Acampamentos',         'expense','debit',5,true,'4.1.4.01'),
('4.1.4.01.003',  'Propaganda e Publicidade (Rádio, TV, Internet)','expense','debit',5,true,'4.1.4.01'),
('4.1.5',         'Repasses Denominacionais Institucionais',       'expense','debit',3,false,'4.1'),
('4.1.5.01',      'Repasses à Denominação',                        'expense','debit',4,false,'4.1.5'),
('4.1.5.01.001',  'Repasses para a Convenção / Sede Nacional',     'expense','debit',5,true,'4.1.5.01'),
('4.1.5.01.002',  'Fundo Missionário Denominacional',              'expense','debit',5,true,'4.1.5.01'),
('4.1.5.01.003',  'Dízimo dos Dízimos (Conforme Estatuto)',        'expense','debit',5,true,'4.1.5.01'),
('4.1.6',         'Contrapartidas Obrigatórias - Atividade-Fim (ITG 2002)','expense','debit',3,false,'4.1'),
('4.1.6.01',      'Trabalho Voluntário Atividade-Fim',             'expense','debit',4,false,'4.1.6'),
('4.1.6.01.001',  'Despesa c/ Voluntariado - Liderança Religiosa e Missões','expense','debit',5,true,'4.1.6.01'),
('4.2',           'Despesas com Atividades-Meio (Adm. e Operacional)','expense','debit',2,false,'4'),
('4.2.1',         'Pessoal Administrativo e Operacional (Celetistas)','expense','debit',3,false,'4.2'),
('4.2.1.01',      'Salários e Remuneração',                        'expense','debit',4,false,'4.2.1'),
('4.2.1.01.001',  'Salários e Ordenados (Secretaria, Zeladoria)',  'expense','debit',5,true,'4.2.1.01'),
('4.2.1.01.002',  'Férias e 13º Salário',                          'expense','debit',5,true,'4.2.1.01'),
('4.2.1.02',      'Encargos e Benefícios',                         'expense','debit',4,false,'4.2.1'),
('4.2.1.02.001',  'Encargos Sociais (FGTS, INSS Patronal, PIS)',   'expense','debit',5,true,'4.2.1.02'),
('4.2.1.02.002',  'Benefícios (VT, VA, Plano de Saúde)',           'expense','debit',5,true,'4.2.1.02'),
('4.2.1.02.003',  'Rescisões Trabalhistas',                        'expense','debit',5,true,'4.2.1.02'),
('4.2.2',         'Instalações e Manutenção Predial',              'expense','debit',3,false,'4.2'),
('4.2.2.01',      'Despesas Prediais Fixas',                       'expense','debit',4,false,'4.2.2'),
('4.2.2.01.001',  'Aluguéis e Condomínios',                        'expense','debit',5,true,'4.2.2.01'),
('4.2.2.01.002',  'Energia Elétrica',                              'expense','debit',5,true,'4.2.2.01'),
('4.2.2.01.003',  'Água e Esgoto',                                 'expense','debit',5,true,'4.2.2.01'),
('4.2.2.01.004',  'Telefonia e Internet',                          'expense','debit',5,true,'4.2.2.01'),
('4.2.2.01.005',  'Seguros (Predial, Veículos)',                   'expense','debit',5,true,'4.2.2.01'),
('4.2.2.02',      'Manutenção e Conservação',                      'expense','debit',4,false,'4.2.2'),
('4.2.2.02.001',  'Manutenção e Conservação de Imóveis',           'expense','debit',5,true,'4.2.2.02'),
('4.2.2.02.002',  'Manutenção de Veículos e Combustível',          'expense','debit',5,true,'4.2.2.02'),
('4.2.3',         'Materiais de Consumo e Serviços de Terceiros',  'expense','debit',3,false,'4.2'),
('4.2.3.01',      'Materiais de Consumo',                          'expense','debit',4,false,'4.2.3'),
('4.2.3.01.001',  'Material de Escritório e Papelaria',            'expense','debit',5,true,'4.2.3.01'),
('4.2.3.01.002',  'Material de Limpeza e Copa',                    'expense','debit',5,true,'4.2.3.01'),
('4.2.3.02',      'Serviços de Terceiros',                         'expense','debit',4,false,'4.2.3'),
('4.2.3.02.001',  'Honorários Contábeis',                          'expense','debit',5,true,'4.2.3.02'),
('4.2.3.02.002',  'Honorários Advocatícios',                       'expense','debit',5,true,'4.2.3.02'),
('4.2.3.02.003',  'Serviços de Segurança e Monitoramento',         'expense','debit',5,true,'4.2.3.02'),
('4.2.3.02.004',  'Softwares de Gestão, Servidores e TI',          'expense','debit',5,true,'4.2.3.02'),
('4.2.4',         'Despesas Financeiras e Tributárias',            'expense','debit',3,false,'4.2'),
('4.2.4.01',      'Despesas Bancárias',                            'expense','debit',4,false,'4.2.4'),
('4.2.4.01.001',  'Tarifas Bancárias (Manutenção, Boletos)',       'expense','debit',5,true,'4.2.4.01'),
('4.2.4.01.002',  'Taxas de Máquinas de Cartão',                   'expense','debit',5,true,'4.2.4.01'),
('4.2.4.01.003',  'Juros e Multas Pagos',                          'expense','debit',5,true,'4.2.4.01'),
('4.2.4.02',      'Tributos e Taxas',                              'expense','debit',4,false,'4.2.4'),
('4.2.4.02.001',  'IPTU e Taxas Municipais (sem isenção)',         'expense','debit',5,true,'4.2.4.02'),
('4.2.4.02.002',  'IPVA de Veículos',                              'expense','debit',5,true,'4.2.4.02'),
('4.2.4.02.003',  'Certidões, Alvarás e Custas Cartorárias',       'expense','debit',5,true,'4.2.4.02'),
('4.2.5',         'Depreciação e Amortização (Despesas Não Caixa)','expense','debit',3,false,'4.2'),
('4.2.5.01',      'Depreciação',                                   'expense','debit',4,false,'4.2.5'),
('4.2.5.01.001',  'Depreciação de Edificações',                    'expense','debit',5,true,'4.2.5.01'),
('4.2.5.01.002',  'Depreciação de Veículos',                       'expense','debit',5,true,'4.2.5.01'),
('4.2.5.01.003',  'Depreciação de Móveis, Máquinas e Equipamentos','expense','debit',5,true,'4.2.5.01'),
('4.2.5.02',      'Amortização',                                   'expense','debit',4,false,'4.2.5'),
('4.2.5.02.001',  'Amortização de Intangíveis (Sistemas)',         'expense','debit',5,true,'4.2.5.02'),
('4.2.6',         'Contrapartidas Obrigatórias - Atividade-Meio (ITG 2002)','expense','debit',3,false,'4.2'),
('4.2.6.01',      'Trabalho Voluntário Atividade-Meio',            'expense','debit',4,false,'4.2.6'),
('4.2.6.01.001',  'Despesa c/ Voluntariado - Adm., Operação e Música','expense','debit',5,true,'4.2.6.01'),
('4.2.6.02',      'Gratuidades e Imunidades',                      'expense','debit',4,false,'4.2.6'),
('4.2.6.02.001',  'Despesa Equivalente de IPTU e IR (Imunidades)', 'expense','debit',5,true,'4.2.6.02');

-- ══════════════════════════════════════════════════════════════
-- MÓDULO 5: CONTAS DE COMPENSAÇÃO (compensation)
-- ══════════════════════════════════════════════════════════════
INSERT INTO tmp_coa VALUES
('5',             'CONTAS DE COMPENSAÇÃO ATIVAS',                  'compensation','debit',1,false,NULL),
('5.1',           'Direitos, Contratos e Isenções Usufruídas',     'compensation','debit',2,false,'5'),
('5.1.1',         'Bens de Terceiros e Comodatos',                 'compensation','debit',3,false,'5.1'),
('5.1.1.01',      'Controle de Posse',                             'compensation','debit',4,false,'5.1.1'),
('5.1.1.01.001',  'Bens de Terceiros em Comodato',                 'compensation','debit',5,true,'5.1.1.01'),
('5.1.1.01.002',  'Bens e Imóveis Cedidos pelo Poder Público',     'compensation','debit',5,true,'5.1.1.01'),
('5.1.1.01.003',  'Equipamentos Locados/Emprestados',              'compensation','debit',5,true,'5.1.1.01'),
('5.1.2',         'Controle de Imunidades e Gratuidades (ITG 2002)','compensation','debit',3,false,'5.1'),
('5.1.2.01',      'Imunidades e Isenções',                         'compensation','debit',4,false,'5.1.2'),
('5.1.2.01.001',  'Imunidades Tributárias Usufruídas a Comprovar (IR)','compensation','debit',5,true,'5.1.2.01'),
('5.1.2.01.002',  'Isenções Tributárias Usufruídas a Comprovar (IPTU)','compensation','debit',5,true,'5.1.2.01'),
('5.1.3',         'Controles Orçamentários e Projetos',            'compensation','debit',3,false,'5.1'),
('5.1.3.01',      'Orçamento e Apólices',                          'compensation','debit',4,false,'5.1.3'),
('5.1.3.01.001',  'Previsão de Arrecadação (Orçamento de Receitas)','compensation','debit',5,true,'5.1.3.01'),
('5.1.3.01.002',  'Contratos de Seguros Contratados (Apólices)',   'compensation','debit',5,true,'5.1.3.01'),
('6',             'CONTAS DE COMPENSAÇÃO PASSIVAS',                'compensation','credit',1,false,NULL),
('6.1',           'Obrigações, Responsabilidades e Contrapartidas','compensation','credit',2,false,'6'),
('6.1.1',         'Responsabilidade por Bens de Terceiros',        'compensation','credit',3,false,'6.1'),
('6.1.1.01',      'Controle de Responsabilidade',                  'compensation','credit',4,false,'6.1.1'),
('6.1.1.01.001',  'Responsabilidade por Bens em Comodato',         'compensation','credit',5,true,'6.1.1.01'),
('6.1.1.01.002',  'Responsabilidade por Bens Cedidos pelo Poder Público','compensation','credit',5,true,'6.1.1.01'),
('6.1.1.01.003',  'Responsabilidade por Equipamentos Locados',     'compensation','credit',5,true,'6.1.1.01'),
('6.1.2',         'Contrapartida de Imunidades e Gratuidades',     'compensation','credit',3,false,'6.1'),
('6.1.2.01',      'Contrapartidas de Controle',                    'compensation','credit',4,false,'6.1.2'),
('6.1.2.01.001',  'Contrapartida de Imunidades Tributárias Usufruídas','compensation','credit',5,true,'6.1.2.01'),
('6.1.2.01.002',  'Contrapartida de Isenções Tributárias Usufruídas','compensation','credit',5,true,'6.1.2.01'),
('6.1.3',         'Controles Orçamentários (Contrapartidas)',      'compensation','credit',3,false,'6.1'),
('6.1.3.01',      'Orçamento e Apólices (Contrapartidas)',         'compensation','credit',4,false,'6.1.3'),
('6.1.3.01.001',  'Fixação de Despesas (Orçamento de Despesas)',   'compensation','credit',5,true,'6.1.3.01'),
('6.1.3.01.002',  'Responsabilidade sobre Apólices de Seguros',    'compensation','credit',5,true,'6.1.3.01');

-- ── INSERÇÃO HIERÁRQUICA (nível a nível) ─────────────────────

-- Nível 1 (raízes — sem parent)
INSERT INTO public.chart_of_accounts
  (ministry_id, code, name, type, nature, account_level, is_analytical, parent_id)
SELECT m_id, t.code, t.name, t.type::text, t.nature::text, t.lvl, t.is_anal, NULL
FROM tmp_coa t WHERE t.lvl = 1
ON CONFLICT (ministry_id, code) DO NOTHING;

-- Nível 2
INSERT INTO public.chart_of_accounts
  (ministry_id, code, name, type, nature, account_level, is_analytical, parent_id)
SELECT m_id, t.code, t.name, t.type, t.nature, t.lvl, t.is_anal, p.id
FROM tmp_coa t
JOIN public.chart_of_accounts p ON p.ministry_id = m_id AND p.code = t.parent_code
WHERE t.lvl = 2
ON CONFLICT (ministry_id, code) DO NOTHING;

-- Nível 3
INSERT INTO public.chart_of_accounts
  (ministry_id, code, name, type, nature, account_level, is_analytical, parent_id)
SELECT m_id, t.code, t.name, t.type, t.nature, t.lvl, t.is_anal, p.id
FROM tmp_coa t
JOIN public.chart_of_accounts p ON p.ministry_id = m_id AND p.code = t.parent_code
WHERE t.lvl = 3
ON CONFLICT (ministry_id, code) DO NOTHING;

-- Nível 4
INSERT INTO public.chart_of_accounts
  (ministry_id, code, name, type, nature, account_level, is_analytical, parent_id)
SELECT m_id, t.code, t.name, t.type, t.nature, t.lvl, t.is_anal, p.id
FROM tmp_coa t
JOIN public.chart_of_accounts p ON p.ministry_id = m_id AND p.code = t.parent_code
WHERE t.lvl = 4
ON CONFLICT (ministry_id, code) DO NOTHING;

-- Nível 5 (analíticas — recebem lançamentos)
INSERT INTO public.chart_of_accounts
  (ministry_id, code, name, type, nature, account_level, is_analytical, parent_id)
SELECT m_id, t.code, t.name, t.type, t.nature, t.lvl, t.is_anal, p.id
FROM tmp_coa t
JOIN public.chart_of_accounts p ON p.ministry_id = m_id AND p.code = t.parent_code
WHERE t.lvl = 5
ON CONFLICT (ministry_id, code) DO NOTHING;

END $$;
