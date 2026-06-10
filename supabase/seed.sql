-- Inserindo Dicionário de Traços (Semente Inicial)
insert into trait_dictionary (concept_key, grp, unit, direction, code_geneplus, code_pmgz, code_ancp, label) values
('PESO_DESMAMA', 'CRESCIMENTO', 'kg', 'MAIOR_MELHOR', 'PD', 'PD-EDg', 'DPDG', 'Peso à desmama'),
('PESO_SOBREANO', 'CRESCIMENTO', 'kg', 'MAIOR_MELHOR', 'PS', 'PS-EDg', 'DPSG', 'Peso ao sobreano'),
('GANHO_POS_DESMAMA', 'CRESCIMENTO', 'kg', 'MAIOR_MELHOR', 'GPD', null, null, 'Ganho pós-desmama'),
('HABILIDADE_MATERNAL', 'MATERNO', 'kg', 'MAIOR_MELHOR', 'TMD', 'TMDg', 'DMDG', 'Habilidade maternal (peso)'),
('IDADE_PRIMEIRO_PARTO', 'REPRODUCAO', 'dias', 'MENOR_MELHOR', 'IPP', 'IPPg', 'DIPPG', 'Idade ao 1º parto'),
('PERIMETRO_ESCROTAL_365D', 'REPRODUCAO', 'cm', 'MAIOR_MELHOR', 'PES', 'PE-365g', 'DPE365G', 'Perímetro escrotal 365d'),
('PERIMETRO_ESCROTAL_450D', 'REPRODUCAO', 'cm', 'MAIOR_MELHOR', null, 'PE-450g', 'DPE450G', 'Perímetro escrotal 450d'),
('STAYABILITY', 'FUNCIONAL', '%', 'MAIOR_MELHOR', 'HP/STAY', 'STAYg', 'DSTAYG', 'Stay / permanência'),
('AREA_OLHO_LOMBO', 'CARCACA', 'cm²', 'MAIOR_MELHOR', 'AOL', 'AOLg', 'DAOLG', 'Área de olho de lombo'),
('ACABAMENTO_GORDURA', 'CARCACA', 'mm', 'MAIOR_MELHOR', 'EGS', 'ACABg', 'DACABG', 'Acabamento de gordura'),
('MARMOREIO', 'CARCACA', 'escore', 'MAIOR_MELHOR', 'MAR', 'MARg', 'DMARG', 'Marmoreio'),
('PESO_NASCER', 'CRESCIMENTO', 'kg', 'MENOR_MELHOR', 'PN', 'PN-EDg', 'DPNG', 'Peso ao nascer');
