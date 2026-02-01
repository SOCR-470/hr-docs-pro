import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

async function seed() {
  console.log('Connecting to database...');
  const connection = await mysql.createConnection(DATABASE_URL);
  
  console.log('Seeding departments...');
  await connection.execute(`
    INSERT INTO departments (name, description) VALUES
    ('Administrativo', 'Departamento administrativo geral'),
    ('Financeiro', 'Departamento financeiro e contabilidade'),
    ('Operacional', 'Departamento de operações'),
    ('Comercial', 'Departamento comercial e vendas'),
    ('TI', 'Tecnologia da Informação')
    ON DUPLICATE KEY UPDATE name=name
  `);

  console.log('Seeding document types...');
  await connection.execute(`
    INSERT INTO document_types (name, description, category, isRequired, validityDays) VALUES
    ('Contrato de Trabalho', 'Contrato de trabalho assinado', 'admission', true, NULL),
    ('RG', 'Documento de identidade', 'admission', true, NULL),
    ('CPF', 'Cadastro de Pessoa Física', 'admission', true, NULL),
    ('Comprovante de Residência', 'Comprovante de endereço atualizado', 'admission', true, 180),
    ('Carteira de Trabalho', 'CTPS digital ou física', 'admission', true, NULL),
    ('Certidão de Nascimento/Casamento', 'Estado civil', 'admission', false, NULL),
    ('Título de Eleitor', 'Documento eleitoral', 'admission', false, NULL),
    ('Certificado de Reservista', 'Para homens', 'admission', false, NULL),
    ('CNH', 'Carteira Nacional de Habilitação', 'compliance', false, 1825),
    ('ASO', 'Atestado de Saúde Ocupacional', 'compliance', true, 365),
    ('PCMSO', 'Programa de Controle Médico', 'compliance', true, 365),
    ('Ficha de EPI', 'Equipamentos de Proteção Individual', 'compliance', false, NULL),
    ('Atestado Médico', 'Atestados e justificativas médicas', 'personal', false, NULL),
    ('Advertência', 'Advertências disciplinares', 'personal', false, NULL),
    ('TRCT', 'Termo de Rescisão de Contrato', 'personal', false, NULL)
    ON DUPLICATE KEY UPDATE name=name
  `);

  console.log('Seeding employees...');
  const employeesData = [
    ['Maria Silva Santos', '123.456.789-00', 'maria.silva@empresa.com', '(11) 99999-1111', 'Analista Administrativo', 1, '2023-01-15', '4500.00', '08:00-17:00', 'active', 92],
    ['João Pedro Oliveira', '234.567.890-11', 'joao.oliveira@empresa.com', '(11) 99999-2222', 'Contador', 2, '2022-06-01', '6200.00', '08:00-17:00', 'active', 88],
    ['Ana Carolina Costa', '345.678.901-22', 'ana.costa@empresa.com', '(11) 99999-3333', 'Operador de Produção', 3, '2023-03-20', '2800.00', '06:00-14:00', 'active', 75],
    ['Carlos Eduardo Lima', '456.789.012-33', 'carlos.lima@empresa.com', '(11) 99999-4444', 'Vendedor', 4, '2022-11-10', '3500.00', '09:00-18:00', 'active', 95],
    ['Fernanda Rodrigues', '567.890.123-44', 'fernanda.rodrigues@empresa.com', '(11) 99999-5555', 'Desenvolvedora', 5, '2023-02-01', '8500.00', '09:00-18:00', 'active', 98],
    ['Ricardo Almeida', '678.901.234-55', 'ricardo.almeida@empresa.com', '(11) 99999-6666', 'Auxiliar Administrativo', 1, '2023-05-15', '2200.00', '08:00-17:00', 'active', 82],
    ['Patricia Souza', '789.012.345-66', 'patricia.souza@empresa.com', '(11) 99999-7777', 'Analista Financeiro', 2, '2022-09-01', '5800.00', '08:00-17:00', 'active', 90],
    ['Marcos Pereira', '890.123.456-77', 'marcos.pereira@empresa.com', '(11) 99999-8888', 'Supervisor de Produção', 3, '2021-08-01', '4200.00', '06:00-14:00', 'active', 68],
    ['Juliana Martins', '901.234.567-88', 'juliana.martins@empresa.com', '(11) 99999-9999', 'Coordenadora Comercial', 4, '2022-03-15', '7500.00', '09:00-18:00', 'active', 94],
    ['Bruno Ferreira', '012.345.678-99', 'bruno.ferreira@empresa.com', '(11) 99999-0000', 'Analista de Sistemas', 5, '2023-04-01', '7200.00', '09:00-18:00', 'active', 96],
  ];

  for (const emp of employeesData) {
    await connection.execute(`
      INSERT INTO employees (name, cpf, email, phone, position, departmentId, admissionDate, salary, workHours, status, complianceScore)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE name=name
    `, emp);
  }

  console.log('Seeding compliance alerts...');
  // Using correct enum values from schema
  const alertsData = [
    [3, 'late_arrival', 'high', 'Atrasos Frequentes', 'Funcionário apresentou 5 atrasos no último mês', 'open'],
    [8, 'missing_punch', 'critical', 'Batidas Faltantes', 'Registro de ponto incompleto em 3 dias', 'open'],
    [3, 'unauthorized_overtime', 'medium', 'Horas Extras Não Autorizadas', '12 horas extras sem aprovação prévia', 'open'],
    [6, 'document_expiring_soon', 'high', 'ASO Vencendo', 'Atestado de Saúde Ocupacional vence em 15 dias', 'open'],
    [1, 'late_arrival', 'low', 'Atraso Pontual', 'Atraso de 15 minutos registrado', 'resolved'],
  ];

  for (const alert of alertsData) {
    await connection.execute(`
      INSERT INTO compliance_alerts (employeeId, type, severity, title, description, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, alert);
  }

  console.log('Seed completed successfully!');
  await connection.end();
}

seed().catch(console.error);
