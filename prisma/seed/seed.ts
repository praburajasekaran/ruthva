import { PrismaClient, JourneyStatus, RiskLevel, EventType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Starting seed...')

    // 1. Create a dummy user
    const user = await prisma.user.upsert({
        where: { email: 'doctor@ruthva.com' },
        update: {},
        create: {
            email: 'doctor@ruthva.com',
            name: 'Dr. Adiram',
        },
    })

    // 2. Create a Clinic
    const clinic = await prisma.clinic.upsert({
        where: { userId: user.id },
        update: {},
        create: {
            name: 'Sanjeevani Ayurveda Center',
            doctorName: 'Dr. Adiram',
            whatsappNumber: '919876543210',
            userId: user.id,
        },
    })

    console.log('Created clinic:', clinic.name)

    // Wait, let's create a few patients first
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]

    // Helper to add days
    const addDays = (date: Date, days: number) => {
        const result = new Date(date)
        result.setDate(result.getDate() + days)
        return result
    }

    // Helper to get Date only (zeroed time)
    const getDateOnly = (date: Date) => {
        return new Date(date.toISOString().split('T')[0])
    }

    // --- Patient 1: The Ideal Patient (Everything goes well) ---
    const patient1 = await prisma.patient.create({
        data: {
            clinicId: clinic.id,
            name: 'Priya Sharma',
            phone: '+919876543211',
            phoneHash: 'hash1',
            consentGiven: true,
        }
    })

    const journey1Start = addDays(today, -14) // Started 2 weeks ago

    const journey1 = await prisma.journey.create({
        data: {
            patientId: patient1.id,
            clinicId: clinic.id,
            startDate: getDateOnly(journey1Start),
            durationDays: 30,
            followupIntervalDays: 7,
            status: JourneyStatus.active,
            riskLevel: RiskLevel.stable,
            lastVisitDate: getDateOnly(addDays(today, -7)),
            nextVisitDate: getDateOnly(today),
        }
    })

    // Events for Patient 1
    await prisma.event.createMany({
        data: [
            {
                journeyId: journey1.id,
                eventType: EventType.journey_started,
                eventDate: getDateOnly(journey1Start),
                eventTime: journey1Start,
                createdBy: 'system'
            },
            // First follow-up (Day 7)
            {
                journeyId: journey1.id,
                eventType: EventType.visit_expected,
                eventDate: getDateOnly(addDays(journey1Start, 7)),
                eventTime: addDays(journey1Start, 7),
                createdBy: 'system'
            },
            {
                journeyId: journey1.id,
                eventType: EventType.reminder_sent,
                eventDate: getDateOnly(addDays(journey1Start, 6)),
                eventTime: addDays(journey1Start, 6),
                createdBy: 'system',
                metadata: { type: 'pre_visit_reminder' }
            },
            {
                journeyId: journey1.id,
                eventType: EventType.visit_confirmed,
                eventDate: getDateOnly(addDays(journey1Start, 7)),
                eventTime: addDays(journey1Start, 7),
                createdBy: 'user' // Staff clicked confirmed
            },
            // Second follow-up (Day 14 - Today)
            {
                journeyId: journey1.id,
                eventType: EventType.visit_expected,
                eventDate: getDateOnly(today),
                eventTime: today,
                createdBy: 'system'
            }
        ]
    })

    // --- Patient 2: The Dropped Patient (Missed visit, getting recovery message) ---
    const patient2 = await prisma.patient.create({
        data: {
            clinicId: clinic.id,
            name: 'Rahul Kumar',
            phone: '+919876543212',
            phoneHash: 'hash2',
            consentGiven: true,
        }
    })

    const journey2Start = addDays(today, -10) // Started 10 days ago

    const journey2 = await prisma.journey.create({
        data: {
            patientId: patient2.id,
            clinicId: clinic.id,
            startDate: getDateOnly(journey2Start),
            durationDays: 45,
            followupIntervalDays: 7,
            status: JourneyStatus.active,
            riskLevel: RiskLevel.at_risk,
            riskReason: 'Missed scheduled follow-up on Day 7',
            lastVisitDate: getDateOnly(journey2Start),
            missedVisits: 1,
            recoveryAttempts: 1,
        }
    })

    await prisma.event.createMany({
        data: [
            {
                journeyId: journey2.id,
                eventType: EventType.journey_started,
                eventDate: getDateOnly(journey2Start),
                eventTime: journey2Start,
                createdBy: 'system'
            },
            // First follow-up (Day 7)
            {
                journeyId: journey2.id,
                eventType: EventType.visit_expected,
                eventDate: getDateOnly(addDays(journey2Start, 7)),
                eventTime: addDays(journey2Start, 7),
                createdBy: 'system'
            },
            {
                journeyId: journey2.id,
                eventType: EventType.visit_missed,
                eventDate: getDateOnly(addDays(journey2Start, 8)), // Day after expected
                eventTime: addDays(journey2Start, 8),
                createdBy: 'system'
            },
            {
                journeyId: journey2.id,
                eventType: EventType.recovery_message_sent,
                eventDate: getDateOnly(addDays(journey2Start, 8)),
                eventTime: addDays(journey2Start, 8),
                createdBy: 'system',
                metadata: { template: 'missed_visit_recovery' }
            }
        ]
    })

    // --- Patient 3: The Recovered Patient (Missed, got message, replied/returned) ---
    const patient3 = await prisma.patient.create({
        data: {
            clinicId: clinic.id,
            name: 'Anita Desai',
            phone: '+919876543213',
            phoneHash: 'hash3',
            consentGiven: true,
        }
    })

    const journey3Start = addDays(today, -20)

    const journey3 = await prisma.journey.create({
        data: {
            patientId: patient3.id,
            clinicId: clinic.id,
            startDate: getDateOnly(journey3Start),
            durationDays: 60,
            followupIntervalDays: 14,
            status: JourneyStatus.active,
            riskLevel: RiskLevel.stable, // Was at risk, now stable again
            lastVisitDate: getDateOnly(today), // Returned today
            nextVisitDate: getDateOnly(addDays(today, 14)),
            missedVisits: 1,
            recoveryAttempts: 1,
        }
    })

    await prisma.event.createMany({
        data: [
            {
                journeyId: journey3.id,
                eventType: EventType.journey_started,
                eventDate: getDateOnly(journey3Start),
                eventTime: journey3Start,
                createdBy: 'system'
            },
            // Follow-up (Day 14)
            {
                journeyId: journey3.id,
                eventType: EventType.visit_expected,
                eventDate: getDateOnly(addDays(journey3Start, 14)),
                eventTime: addDays(journey3Start, 14),
                createdBy: 'system'
            },
            {
                journeyId: journey3.id,
                eventType: EventType.visit_missed,
                eventDate: getDateOnly(addDays(journey3Start, 17)), // Marked missed after 3 days
                eventTime: addDays(journey3Start, 17),
                createdBy: 'system'
            },
            {
                journeyId: journey3.id,
                eventType: EventType.recovery_message_sent,
                eventDate: getDateOnly(addDays(journey3Start, 17)),
                eventTime: addDays(journey3Start, 17),
                createdBy: 'system'
            },
            // Patient replies and returns today
            {
                journeyId: journey3.id,
                eventType: EventType.adherence_response,
                eventDate: getDateOnly(addDays(today, -1)),
                eventTime: addDays(today, -1),
                createdBy: 'patient',
                metadata: { source: 'whatsapp_webhook', text: 'I am coming tomorrow' }
            },
            {
                journeyId: journey3.id,
                eventType: EventType.patient_returned,
                eventDate: getDateOnly(today),
                eventTime: today,
                createdBy: 'user', // Staff confirmed
            }
        ]
    })

    console.log('Seed completed successfully.')
    console.log('Created 3 sample patients with different journey states:')
    console.log('1. Priya (Ideal flow, scheduled for today)')
    console.log('2. Rahul (Dropped off, At Risk)')
    console.log('3. Anita (Missed, but recovered today)')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
