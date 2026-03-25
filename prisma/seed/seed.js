const { PrismaClient, JourneyStatus, RiskLevel, EventType } = require('@prisma/client')

const prisma = new PrismaClient()

// ── Helpers ─────────────────────────────────────────────
const addDays = (date, days) => {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
}

const addHours = (date, hours) => {
    const result = new Date(date)
    result.setHours(result.getHours() + hours)
    return result
}

const getDateOnly = (date) => new Date(date.toISOString().split('T')[0])

const today = new Date()
const todayStr = today.toISOString().split('T')[0]

// Realistic Indian names for an Ayurveda clinic
const PATIENTS = [
    // ── STABLE patients (good adherence) ──────────────────
    { name: 'Priya Sharma', phone: '+919876543211', hash: 'demo_hash_01', risk: 'stable', startDaysAgo: 14, duration: 30, interval: 7, missed: 0, scenario: 'ideal' },
    { name: 'Lakshmi Iyer', phone: '+919876543214', hash: 'demo_hash_02', risk: 'stable', startDaysAgo: 21, duration: 45, interval: 7, missed: 0, scenario: 'ideal' },
    { name: 'Meena Nair', phone: '+919876543215', hash: 'demo_hash_03', risk: 'stable', startDaysAgo: 35, duration: 60, interval: 14, missed: 0, scenario: 'ideal' },
    { name: 'Sanjay Patel', phone: '+919876543216', hash: 'demo_hash_04', risk: 'stable', startDaysAgo: 7, duration: 30, interval: 7, missed: 0, scenario: 'new' },
    { name: 'Deepa Menon', phone: '+919876543217', hash: 'demo_hash_05', risk: 'stable', startDaysAgo: 28, duration: 45, interval: 7, missed: 0, scenario: 'ideal' },
    { name: 'Ravi Krishnan', phone: '+919876543218', hash: 'demo_hash_06', risk: 'stable', startDaysAgo: 10, duration: 30, interval: 7, missed: 0, scenario: 'new' },
    { name: 'Sunita Reddy', phone: '+919876543219', hash: 'demo_hash_07', risk: 'stable', startDaysAgo: 45, duration: 60, interval: 14, missed: 0, scenario: 'ideal' },
    { name: 'Kavitha Bhat', phone: '+919876543220', hash: 'demo_hash_08', risk: 'stable', startDaysAgo: 18, duration: 30, interval: 7, missed: 0, scenario: 'ideal' },
    { name: 'Arjun Das', phone: '+919876543221', hash: 'demo_hash_09', risk: 'stable', startDaysAgo: 3, duration: 30, interval: 7, missed: 0, scenario: 'new' },
    { name: 'Pooja Gupta', phone: '+919876543222', hash: 'demo_hash_10', risk: 'stable', startDaysAgo: 50, duration: 90, interval: 14, missed: 0, scenario: 'ideal' },

    // ── WATCH patients (minor concern) ────────────────────
    { name: 'Anil Verma', phone: '+919876543223', hash: 'demo_hash_11', risk: 'watch', startDaysAgo: 16, duration: 30, interval: 7, missed: 0, scenario: 'late_response', riskReason: 'Slow response to adherence check on Day 14' },
    { name: 'Geeta Joshi', phone: '+919876543224', hash: 'demo_hash_12', risk: 'watch', startDaysAgo: 25, duration: 45, interval: 7, missed: 0, scenario: 'late_response', riskReason: 'Delayed reply to follow-up reminder' },
    { name: 'Vikram Singh', phone: '+919876543225', hash: 'demo_hash_13', risk: 'watch', startDaysAgo: 12, duration: 30, interval: 7, missed: 0, scenario: 'late_response', riskReason: 'No response to adherence check yet' },

    // ── AT_RISK patients (missed visits) ──────────────────
    { name: 'Rahul Kumar', phone: '+919876543212', hash: 'demo_hash_14', risk: 'at_risk', startDaysAgo: 10, duration: 45, interval: 7, missed: 1, scenario: 'missed_once', riskReason: 'Missed scheduled follow-up on Day 7' },
    { name: 'Neha Saxena', phone: '+919876543226', hash: 'demo_hash_15', risk: 'at_risk', startDaysAgo: 22, duration: 45, interval: 7, missed: 1, scenario: 'missed_once', riskReason: 'Missed follow-up on Day 21 — no response to reminder' },
    { name: 'Manoj Tiwari', phone: '+919876543227', hash: 'demo_hash_16', risk: 'at_risk', startDaysAgo: 30, duration: 60, interval: 14, missed: 2, scenario: 'missed_twice', riskReason: 'Missed 2 consecutive follow-ups (Day 14 & 28)' },
    { name: 'Divya Pillai', phone: '+919876543228', hash: 'demo_hash_17', risk: 'at_risk', startDaysAgo: 18, duration: 30, interval: 7, missed: 1, scenario: 'missed_once', riskReason: 'Missed visit on Day 14 — recovery message sent' },

    // ── CRITICAL patients ─────────────────────────────────
    { name: 'Suresh Yadav', phone: '+919876543229', hash: 'demo_hash_18', risk: 'critical', startDaysAgo: 40, duration: 60, interval: 7, missed: 3, scenario: 'critical_dropout', riskReason: 'Missed 3 visits — no response to any recovery messages' },
    { name: 'Kamala Devi', phone: '+919876543230', hash: 'demo_hash_19', risk: 'critical', startDaysAgo: 35, duration: 45, interval: 7, missed: 3, scenario: 'critical_dropout', riskReason: 'Unreachable after Day 14 — multiple recovery attempts failed' },

    // ── RECOVERED patients (were at risk, now stable) ─────
    { name: 'Anita Desai', phone: '+919876543213', hash: 'demo_hash_20', risk: 'stable', startDaysAgo: 20, duration: 60, interval: 14, missed: 1, scenario: 'recovered', riskReason: null },
    { name: 'Ramesh Kulkarni', phone: '+919876543231', hash: 'demo_hash_21', risk: 'stable', startDaysAgo: 28, duration: 45, interval: 7, missed: 1, scenario: 'recovered', riskReason: null },
    { name: 'Fatima Sheikh', phone: '+919876543232', hash: 'demo_hash_22', risk: 'stable', startDaysAgo: 35, duration: 60, interval: 14, missed: 1, scenario: 'recovered', riskReason: null },

    // ── COMPLETED journeys ────────────────────────────────
    { name: 'Harish Rao', phone: '+919876543233', hash: 'demo_hash_23', risk: 'stable', startDaysAgo: 35, duration: 30, interval: 7, missed: 0, scenario: 'completed', status: 'completed' },
    { name: 'Padma Venkat', phone: '+919876543234', hash: 'demo_hash_24', risk: 'stable', startDaysAgo: 50, duration: 45, interval: 7, missed: 0, scenario: 'completed', status: 'completed' },

    // ── DROPPED journey ───────────────────────────────────
    { name: 'Rajesh Nanda', phone: '+919876543235', hash: 'demo_hash_25', risk: 'critical', startDaysAgo: 60, duration: 90, interval: 14, missed: 4, scenario: 'dropped', status: 'dropped', riskReason: 'Patient unreachable — marked as dropped after 4 missed visits' },
]

// ── Event builders ──────────────────────────────────────

function buildIdealEvents(journeyStart, interval, daysActive) {
    const events = [
        { type: EventType.journey_started, date: journeyStart, time: addHours(journeyStart, 10), by: 'system' },
    ]
    let visitDay = interval
    while (visitDay <= daysActive) {
        // Reminder day before
        events.push({ type: EventType.reminder_sent, date: addDays(journeyStart, visitDay - 1), time: addHours(addDays(journeyStart, visitDay - 1), 9), by: 'system', meta: { type: 'pre_visit_reminder' } })
        // Visit expected
        events.push({ type: EventType.visit_expected, date: addDays(journeyStart, visitDay), time: addHours(addDays(journeyStart, visitDay), 10), by: 'system' })
        // Visit confirmed
        events.push({ type: EventType.visit_confirmed, date: addDays(journeyStart, visitDay), time: addHours(addDays(journeyStart, visitDay), 14), by: 'user' })
        visitDay += interval
    }
    // Next expected visit if still in future
    if (visitDay <= daysActive + interval) {
        events.push({ type: EventType.visit_expected, date: addDays(journeyStart, visitDay), time: addHours(addDays(journeyStart, visitDay), 10), by: 'system' })
    }
    return events
}

function buildNewPatientEvents(journeyStart) {
    return [
        { type: EventType.journey_started, date: journeyStart, time: addHours(journeyStart, 10), by: 'system' },
    ]
}

function buildLateResponseEvents(journeyStart, interval, daysActive) {
    const events = buildIdealEvents(journeyStart, interval, Math.min(daysActive, interval))
    // Adherence check sent
    events.push({ type: EventType.adherence_check_sent, date: addDays(journeyStart, daysActive - 2), time: addHours(addDays(journeyStart, daysActive - 2), 9), by: 'system' })
    return events
}

function buildMissedOnceEvents(journeyStart, interval, daysActive) {
    const events = [
        { type: EventType.journey_started, date: journeyStart, time: addHours(journeyStart, 10), by: 'system' },
    ]
    // First visits confirmed (if there were any before the missed one)
    let visitDay = interval
    while (visitDay < daysActive - interval) {
        events.push({ type: EventType.visit_expected, date: addDays(journeyStart, visitDay), time: addHours(addDays(journeyStart, visitDay), 10), by: 'system' })
        events.push({ type: EventType.visit_confirmed, date: addDays(journeyStart, visitDay), time: addHours(addDays(journeyStart, visitDay), 14), by: 'user' })
        visitDay += interval
    }
    // Missed visit
    const missedDay = visitDay
    events.push({ type: EventType.reminder_sent, date: addDays(journeyStart, missedDay - 1), time: addHours(addDays(journeyStart, missedDay - 1), 9), by: 'system' })
    events.push({ type: EventType.visit_expected, date: addDays(journeyStart, missedDay), time: addHours(addDays(journeyStart, missedDay), 10), by: 'system' })
    events.push({ type: EventType.visit_missed, date: addDays(journeyStart, missedDay + 1), time: addHours(addDays(journeyStart, missedDay + 1), 10), by: 'system' })
    events.push({ type: EventType.recovery_message_sent, date: addDays(journeyStart, missedDay + 1), time: addHours(addDays(journeyStart, missedDay + 1), 11), by: 'system', meta: { template: 'missed_visit_recovery' } })
    return events
}

function buildMissedTwiceEvents(journeyStart, interval) {
    const events = [
        { type: EventType.journey_started, date: journeyStart, time: addHours(journeyStart, 10), by: 'system' },
    ]
    // First visit - missed
    events.push({ type: EventType.visit_expected, date: addDays(journeyStart, interval), time: addHours(addDays(journeyStart, interval), 10), by: 'system' })
    events.push({ type: EventType.visit_missed, date: addDays(journeyStart, interval + 1), time: addHours(addDays(journeyStart, interval + 1), 10), by: 'system' })
    events.push({ type: EventType.recovery_message_sent, date: addDays(journeyStart, interval + 1), time: addHours(addDays(journeyStart, interval + 1), 11), by: 'system', meta: { template: 'missed_visit_recovery' } })
    // Second visit - missed
    events.push({ type: EventType.visit_expected, date: addDays(journeyStart, interval * 2), time: addHours(addDays(journeyStart, interval * 2), 10), by: 'system' })
    events.push({ type: EventType.visit_missed, date: addDays(journeyStart, interval * 2 + 1), time: addHours(addDays(journeyStart, interval * 2 + 1), 10), by: 'system' })
    events.push({ type: EventType.recovery_message_sent, date: addDays(journeyStart, interval * 2 + 2), time: addHours(addDays(journeyStart, interval * 2 + 2), 9), by: 'system', meta: { template: 'missed_visit_followup' } })
    return events
}

function buildCriticalDropoutEvents(journeyStart, interval) {
    const events = [
        { type: EventType.journey_started, date: journeyStart, time: addHours(journeyStart, 10), by: 'system' },
    ]
    // First visit confirmed
    events.push({ type: EventType.visit_expected, date: addDays(journeyStart, interval), time: addHours(addDays(journeyStart, interval), 10), by: 'system' })
    events.push({ type: EventType.visit_confirmed, date: addDays(journeyStart, interval), time: addHours(addDays(journeyStart, interval), 15), by: 'user' })
    // Then 3 missed visits in a row
    for (let i = 2; i <= 4; i++) {
        const day = interval * i
        events.push({ type: EventType.reminder_sent, date: addDays(journeyStart, day - 1), time: addHours(addDays(journeyStart, day - 1), 9), by: 'system' })
        events.push({ type: EventType.visit_expected, date: addDays(journeyStart, day), time: addHours(addDays(journeyStart, day), 10), by: 'system' })
        events.push({ type: EventType.visit_missed, date: addDays(journeyStart, day + 1), time: addHours(addDays(journeyStart, day + 1), 10), by: 'system' })
        events.push({ type: EventType.recovery_message_sent, date: addDays(journeyStart, day + 2), time: addHours(addDays(journeyStart, day + 2), 9), by: 'system', meta: { template: i === 2 ? 'missed_visit_recovery' : 'escalated_recovery' } })
    }
    return events
}

function buildRecoveredEvents(journeyStart, interval, daysActive) {
    const events = [
        { type: EventType.journey_started, date: journeyStart, time: addHours(journeyStart, 10), by: 'system' },
    ]
    // First visit confirmed
    events.push({ type: EventType.visit_expected, date: addDays(journeyStart, interval), time: addHours(addDays(journeyStart, interval), 10), by: 'system' })
    events.push({ type: EventType.visit_confirmed, date: addDays(journeyStart, interval), time: addHours(addDays(journeyStart, interval), 14), by: 'user' })
    // Missed second visit
    const missedDay = interval * 2
    events.push({ type: EventType.visit_expected, date: addDays(journeyStart, missedDay), time: addHours(addDays(journeyStart, missedDay), 10), by: 'system' })
    events.push({ type: EventType.visit_missed, date: addDays(journeyStart, missedDay + 2), time: addHours(addDays(journeyStart, missedDay + 2), 10), by: 'system' })
    events.push({ type: EventType.recovery_message_sent, date: addDays(journeyStart, missedDay + 2), time: addHours(addDays(journeyStart, missedDay + 2), 11), by: 'system' })
    // Patient responded and returned within this month
    const returnedDaysAgo = Math.min(5, Math.floor(Math.random() * 8) + 1)
    events.push({ type: EventType.adherence_response, date: addDays(today, -(returnedDaysAgo + 1)), time: addHours(addDays(today, -(returnedDaysAgo + 1)), 16), by: 'patient', meta: { source: 'whatsapp_webhook', text: 'I will come for my follow-up' } })
    events.push({ type: EventType.patient_returned, date: addDays(today, -returnedDaysAgo), time: addHours(addDays(today, -returnedDaysAgo), 11), by: 'user' })
    // And next visit confirmed after return
    events.push({ type: EventType.visit_confirmed, date: addDays(today, -returnedDaysAgo), time: addHours(addDays(today, -returnedDaysAgo), 14), by: 'user' })
    return events
}

function buildCompletedEvents(journeyStart, duration, interval) {
    const events = [
        { type: EventType.journey_started, date: journeyStart, time: addHours(journeyStart, 10), by: 'system' },
    ]
    let visitDay = interval
    while (visitDay <= duration) {
        events.push({ type: EventType.reminder_sent, date: addDays(journeyStart, visitDay - 1), time: addHours(addDays(journeyStart, visitDay - 1), 9), by: 'system' })
        events.push({ type: EventType.visit_expected, date: addDays(journeyStart, visitDay), time: addHours(addDays(journeyStart, visitDay), 10), by: 'system' })
        events.push({ type: EventType.visit_confirmed, date: addDays(journeyStart, visitDay), time: addHours(addDays(journeyStart, visitDay), 14), by: 'user' })
        visitDay += interval
    }
    return events
}

function buildDroppedEvents(journeyStart, interval) {
    const events = buildCriticalDropoutEvents(journeyStart, interval)
    // One more failed attempt
    events.push({ type: EventType.adherence_check_sent, date: addDays(journeyStart, interval * 5), time: addHours(addDays(journeyStart, interval * 5), 9), by: 'system' })
    return events
}

function buildEventsForScenario(scenario, journeyStart, interval, daysActive, duration) {
    switch (scenario) {
        case 'ideal': return buildIdealEvents(journeyStart, interval, daysActive)
        case 'new': return buildNewPatientEvents(journeyStart)
        case 'late_response': return buildLateResponseEvents(journeyStart, interval, daysActive)
        case 'missed_once': return buildMissedOnceEvents(journeyStart, interval, daysActive)
        case 'missed_twice': return buildMissedTwiceEvents(journeyStart, interval)
        case 'critical_dropout': return buildCriticalDropoutEvents(journeyStart, interval)
        case 'recovered': return buildRecoveredEvents(journeyStart, interval, daysActive)
        case 'completed': return buildCompletedEvents(journeyStart, duration, interval)
        case 'dropped': return buildDroppedEvents(journeyStart, interval)
        default: return buildNewPatientEvents(journeyStart)
    }
}

// ── Main seed function ──────────────────────────────────

async function main() {
    console.log('Starting demo seed...')

    // Clean existing demo data
    await prisma.event.deleteMany({})
    await prisma.journey.deleteMany({})
    await prisma.patient.deleteMany({})
    await prisma.clinic.deleteMany({})
    await prisma.session.deleteMany({})
    await prisma.account.deleteMany({})
    await prisma.ssoToken.deleteMany({})
    await prisma.user.deleteMany({})

    // ── Create Demo User & Clinic ───────────────────────
    const demoUser = await prisma.user.create({
        data: {
            email: 'demo@ruthva.com',
            name: 'Dr. Kavitha Rajan',
        },
    })

    const demoClinic = await prisma.clinic.create({
        data: {
            name: 'Vaidya Wellness Ayurveda',
            doctorName: 'Dr. Kavitha Rajan',
            whatsappNumber: '919800000001',
            email: 'demo@ruthva.com',
            userId: demoUser.id,
        },
    })

    console.log(`Created demo clinic: ${demoClinic.name}`)

    // ── Create Patients, Journeys & Events ──────────────
    let createdCount = 0

    for (const p of PATIENTS) {
        const patient = await prisma.patient.create({
            data: {
                clinicId: demoClinic.id,
                name: p.name,
                phone: p.phone,
                phoneHash: p.hash,
                consentGiven: true,
                consentGivenAt: addDays(today, -p.startDaysAgo),
                consentMethod: 'verbal',
                consentCapturedBy: 'staff',
            },
        })

        const journeyStart = addDays(today, -p.startDaysAgo)
        const status = p.status || 'active'
        const daysActive = p.startDaysAgo

        // Calculate lastVisitDate and nextVisitDate
        let lastVisitDate = null
        let nextVisitDate = null

        if (p.scenario === 'recovered') {
            const returnedDaysAgo = Math.min(5, 3) // consistent for demo
            lastVisitDate = getDateOnly(addDays(today, -returnedDaysAgo))
            nextVisitDate = getDateOnly(addDays(today, p.interval - returnedDaysAgo))
        } else if (p.scenario === 'ideal') {
            // Last confirmed visit
            const lastVisitDay = Math.floor(daysActive / p.interval) * p.interval
            lastVisitDate = getDateOnly(addDays(journeyStart, lastVisitDay))
            nextVisitDate = getDateOnly(addDays(journeyStart, lastVisitDay + p.interval))
        } else if (p.scenario === 'new') {
            lastVisitDate = getDateOnly(journeyStart)
            nextVisitDate = getDateOnly(addDays(journeyStart, p.interval))
        } else if (p.scenario === 'completed') {
            lastVisitDate = getDateOnly(addDays(journeyStart, p.duration))
            nextVisitDate = null
        } else if (p.scenario === 'missed_once' || p.scenario === 'missed_twice' || p.scenario === 'critical_dropout' || p.scenario === 'dropped') {
            // Last visit was either start or first confirmed visit
            lastVisitDate = p.scenario === 'critical_dropout' || p.scenario === 'dropped'
                ? getDateOnly(addDays(journeyStart, p.interval))
                : getDateOnly(journeyStart)
            nextVisitDate = null // overdue
        } else if (p.scenario === 'late_response') {
            const lastVisitDay = Math.floor(Math.min(daysActive, p.interval) / p.interval) * p.interval
            lastVisitDate = getDateOnly(addDays(journeyStart, lastVisitDay))
            nextVisitDate = getDateOnly(addDays(journeyStart, lastVisitDay + p.interval))
        }

        const journey = await prisma.journey.create({
            data: {
                patientId: patient.id,
                clinicId: demoClinic.id,
                startDate: getDateOnly(journeyStart),
                durationDays: p.duration,
                followupIntervalDays: p.interval,
                status: JourneyStatus[status],
                riskLevel: RiskLevel[p.risk],
                riskReason: p.riskReason || null,
                riskUpdatedAt: p.risk !== 'stable' ? addDays(today, -Math.floor(Math.random() * 5)) : null,
                lastVisitDate,
                nextVisitDate,
                missedVisits: p.missed,
                recoveryAttempts: p.scenario === 'critical_dropout' ? 3 : p.scenario === 'dropped' ? 4 : p.missed > 0 ? p.missed : 0,
            },
        })

        // Build events for this journey
        const rawEvents = buildEventsForScenario(p.scenario, journeyStart, p.interval, daysActive, p.duration)

        // De-duplicate events by (eventType, eventDate) — Prisma has @@unique([journeyId, eventType, eventDate])
        const seen = new Set()
        const uniqueEvents = rawEvents.filter(e => {
            const key = `${e.type}__${getDateOnly(e.date).toISOString()}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })

        // Insert events one by one to handle any remaining conflicts gracefully
        for (const e of uniqueEvents) {
            try {
                await prisma.event.create({
                    data: {
                        journeyId: journey.id,
                        eventType: e.type,
                        eventDate: getDateOnly(e.date),
                        eventTime: e.time,
                        createdBy: e.by,
                        metadata: e.meta || {},
                    },
                })
            } catch (err) {
                // Skip duplicate events silently
                if (!err.message?.includes('Unique constraint')) {
                    console.warn(`Event insert warning for ${p.name}:`, err.message)
                }
            }
        }

        createdCount++
    }

    console.log('')
    console.log('═══════════════════════════════════════════')
    console.log('  Demo seed completed successfully!')
    console.log('═══════════════════════════════════════════')
    console.log('')
    console.log(`  Clinic:    ${demoClinic.name}`)
    console.log(`  Doctor:    Dr. Kavitha Rajan`)
    console.log(`  Login:     demo@ruthva.com`)
    console.log(`  Patients:  ${createdCount}`)
    console.log('')
    console.log('  Patient breakdown:')
    console.log('    10 Stable (good adherence)')
    console.log('     3 Watch (minor concern)')
    console.log('     4 At Risk (missed visits)')
    console.log('     2 Critical (multiple missed)')
    console.log('     3 Recovered this month')
    console.log('     2 Completed treatments')
    console.log('     1 Dropped off')
    console.log('')
    console.log('  Dashboard will show:')
    console.log('    ~6 patients at risk (at_risk + critical)')
    console.log('    ~3 recovered this month')
    console.log('    ~22 active patients')
    console.log('    Revenue at risk calculation')
    console.log('')
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
