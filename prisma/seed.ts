import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  const password = await bcrypt.hash('123456', 10)

  // ─── Cidades RN ──────────────────────────
  const cities = [
    { city: 'Mossoró',            state: 'RN' },
    { city: 'Natal',              state: 'RN' },
    { city: 'Angicos',            state: 'RN' },
    { city: 'Limoeiro do Norte',  state: 'CE' },
    { city: 'Assú',               state: 'RN' },
  ]

  const getCity = (i: number) => cities[i % cities.length]

  // ─── Personal de teste ────────────────────
  const testPersonals = [
    {
      name:  'Personal Teste',
      email: 'personal@teste.com',
      cpf:   '00000000001',
      cref:  'CREF-000001-G/RN',
      ...cities[0],
    },
  ]

  // ─── 10 Personais extras ──────────────────
  const extraPersonals = [
    { name: 'Carlos Mendes',    email: 'carlos@fitgym.com',    cpf: '11111111101', cref: 'CREF-001001-G/RN', classFormat: 'presential', ...cities[0] },
    { name: 'Fernanda Lima',    email: 'fernanda@fitgym.com',  cpf: '11111111102', cref: 'CREF-001002-G/RN', classFormat: 'online',     ...cities[1] },
    { name: 'Rafael Souza',     email: 'rafael@fitgym.com',    cpf: '11111111103', cref: 'CREF-001003-G/RN', classFormat: 'hybrid',     ...cities[2] },
    { name: 'Juliana Costa',    email: 'juliana@fitgym.com',   cpf: '11111111104', cref: 'CREF-001004-G/RN', classFormat: 'presential', ...cities[3] },
    { name: 'Diego Almeida',    email: 'diego@fitgym.com',     cpf: '11111111105', cref: 'CREF-001005-G/RN', classFormat: 'online',     ...cities[4] },
    { name: 'Mariana Ferreira', email: 'mariana@fitgym.com',   cpf: '11111111106', cref: 'CREF-001006-G/RN', classFormat: 'hybrid',     ...cities[0] },
    { name: 'Thiago Rocha',     email: 'thiago@fitgym.com',    cpf: '11111111107', cref: 'CREF-001007-G/RN', classFormat: 'presential', ...cities[1] },
    { name: 'Camila Nunes',     email: 'camila@fitgym.com',    cpf: '11111111108', cref: 'CREF-001008-G/RN', classFormat: 'online',     ...cities[2] },
    { name: 'Bruno Carvalho',   email: 'bruno@fitgym.com',     cpf: '11111111109', cref: 'CREF-001009-G/RN', classFormat: 'presential', ...cities[3] },
    { name: 'Letícia Barbosa',  email: 'leticia@fitgym.com',   cpf: '11111111110', cref: 'CREF-001010-G/RN', classFormat: 'hybrid',     ...cities[4] },
  ]

  const allPersonalsData = [
    ...testPersonals.map(p => ({ ...p, classFormat: 'presential' })),
    ...extraPersonals,
  ]

  const createdPersonals: any[] = []

  for (const [i, p] of allPersonalsData.entries()) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: p.email }, { cpf: p.cpf }] },
    })

    if (existing) {
      console.log(`Já existe: ${p.email}`)
      createdPersonals.push(existing)
      continue
    }

    const user = await prisma.user.create({
      data: {
        name:     p.name,
        email:    p.email,
        cpf:      p.cpf,
        phone:    `(84) 9${String(9000 + i).padStart(4, '0')}-0001`,
        password,
        role:     'PERSONAL',
        city:     p.city,
        state:    p.state,
        personalProfile: {
          create: {
            sex:            i % 2 === 0 ? 'Masculino' : 'Feminino',
            birthDate:      `${10 + (i % 20)}/0${(i % 9) + 1}/198${i % 9}`,
            weight:         String(65 + i * 2),
            height:         String(160 + i * 2),
            course:         'Educação Física',
            university:     ['UERN', 'UFRN', 'UnP', 'UNIFACEX', 'UFERSA'][i % 5],
            educationLevel: ['Graduação', 'Pós-graduação', 'Mestrado'][i % 3],
            cref:           p.cref,
            classFormat:    p.classFormat,
            availableDays:  ['monday', 'wednesday', 'friday'],
          },
        },
      },
    })

    createdPersonals.push(user)
    console.log(`Personal criado: ${p.name} (${p.city})`)
  }

  // ─── Aluno de teste ───────────────────────
  const testStudent = {
    name:  'Aluno Teste',
    email: 'aluno@teste.com',
    cpf:   '00000000002',
    ...cities[0],
  }

  // ─── 10 Alunos extras ─────────────────────
  const extraStudents = [
    { name: 'Ana Paula Oliveira',   email: 'ana@fitgym.com',      cpf: '22222222201', goal: 'Emagrecimento',      experience: 'beginner',     ...cities[0] },
    { name: 'Pedro Henrique Silva', email: 'pedro@fitgym.com',    cpf: '22222222202', goal: 'Hipertrofia',        experience: 'intermediate', ...cities[1] },
    { name: 'Larissa Mendes',       email: 'larissa@fitgym.com',  cpf: '22222222203', goal: 'Condicionamento',    experience: 'beginner',     ...cities[2] },
    { name: 'Gustavo Ribeiro',      email: 'gustavo@fitgym.com',  cpf: '22222222204', goal: 'Força',              experience: 'advanced',     ...cities[3] },
    { name: 'Isabela Martins',      email: 'isabela@fitgym.com',  cpf: '22222222205', goal: 'Flexibilidade',      experience: 'beginner',     ...cities[4] },
    { name: 'Mateus Cavalcanti',    email: 'mateus@fitgym.com',   cpf: '22222222206', goal: 'Hipertrofia',        experience: 'intermediate', ...cities[0] },
    { name: 'Bianca Freitas',       email: 'bianca@fitgym.com',   cpf: '22222222207', goal: 'Emagrecimento',      experience: 'intermediate', ...cities[1] },
    { name: 'Lucas Pimentel',       email: 'lucas@fitgym.com',    cpf: '22222222208', goal: 'Resistência',        experience: 'beginner',     ...cities[2] },
    { name: 'Vitória Santos',       email: 'vitoria@fitgym.com',  cpf: '22222222209', goal: 'Saúde e bem-estar',  experience: 'beginner',     ...cities[3] },
    { name: 'Felipe Nascimento',    email: 'felipe@fitgym.com',   cpf: '22222222210', goal: 'Definição muscular', experience: 'advanced',     ...cities[4] },
  ]

  const allStudentsData = [
    { ...testStudent, goal: 'Hipertrofia', experience: 'beginner' },
    ...extraStudents,
  ]

  // Vincula os alunos extras ao personal de teste
  const defaultPersonal = createdPersonals[0]

  for (const [i, st] of allStudentsData.entries()) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: st.email }, { cpf: st.cpf }] },
    })

    if (existing) {
      console.log(`Já existe: ${st.email}`)
      continue
    }

    // Aluno de teste não tem personal vinculado
    // Alunos extras são vinculados ao personal de teste
    const personalId = i === 0 ? null : defaultPersonal.id

    await prisma.user.create({
      data: {
        name:       st.name,
        email:      st.email,
        cpf:        st.cpf,
        phone:      `(84) 9${String(8000 + i).padStart(4, '0')}-0002`,
        password,
        role:       'STUDENT',
        city:       st.city,
        state:      st.state,
        personalId,
        studentProfile: {
          create: {
            sex:          i % 2 === 0 ? 'Feminino' : 'Masculino',
            birthDate:    `${10 + (i % 20)}/0${(i % 9) + 1}/199${i % 9}`,
            weight:       String(55 + i * 3),
            height:       String(155 + i * 2),
            goal:         st.goal,
            focusMuscle:  ['Abdômen', 'Peito', 'Pernas', 'Costas', 'Glúteos'][i % 5],
            experience:   st.experience,
            gymType:      i % 2 === 0 ? 'basic' : 'advanced',
            cardio:       i % 2 === 0 ? 'include' : 'exclude',
            trainingDays: ['monday', 'wednesday', 'friday'],
          },
        },
      },
    })

    console.log(`Aluno criado: ${st.name} (${st.city})`)
  }

  console.log('\nSeed concluído!')
  console.log('──────────────────────────────────────────')
  console.log('Credenciais de teste (senha: 123456):')
  console.log('   Personal: personal@teste.com')
  console.log('   Aluno:    aluno@teste.com')
  console.log('──────────────────────────────────────────')
  console.log('Cidades: Mossoró, Natal, Angicos,')
  console.log('            Limoeiro do Norte, Assú')
  console.log('──────────────────────────────────────────')
}

main()
  .catch(e => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })