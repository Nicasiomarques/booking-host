import 'dotenv/config'
import { prisma } from './prisma.client.js'
import { Prisma } from '@prisma/client'
import argon2 from 'argon2'
import { argon2Options } from '#config/index.js'

interface MockService {
  name: string
  description: string
  basePrice: number
  durationMinutes: number
  capacity?: number
  extraItems?: Array<{
    name: string
    price: number
    maxQuantity?: number
  }>
}

interface MockEstablishment {
  name: string
  description: string
  address: string
  timezone: string
  owner: {
    name: string
    email: string
    password: string
  }
  services: MockService[]
}

const mockEstablishments: MockEstablishment[] = [
  {
    name: 'Luxury Hair Salon',
    description: 'Premium hair styling and coloring services in the heart of the city',
    address: '123 Fashion Street, New York, NY 10001',
    timezone: 'America/New_York',
    owner: {
      name: 'Sarah Johnson',
      email: 'sarah@luxuryhairsalon.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Women\'s Haircut',
        description: 'Professional haircut and styling',
        basePrice: 75,
        durationMinutes: 60,
        capacity: 1,
        extraItems: [
          { name: 'Hair Wash', price: 15, maxQuantity: 1 },
          { name: 'Blow Dry', price: 25, maxQuantity: 1 },
        ],
      },
      {
        name: 'Hair Color',
        description: 'Full hair coloring service',
        basePrice: 150,
        durationMinutes: 120,
        capacity: 1,
      },
      {
        name: 'Highlights',
        description: 'Professional highlights application',
        basePrice: 200,
        durationMinutes: 180,
        capacity: 1,
      },
    ],
  },
  {
    name: 'Serenity Spa & Wellness',
    description: 'Relaxing massages, facials, and holistic wellness treatments',
    address: '456 Wellness Avenue, Los Angeles, CA 90001',
    timezone: 'America/Los_Angeles',
    owner: {
      name: 'Michael Chen',
      email: 'michael@serenityspa.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Swedish Massage',
        description: 'Relaxing full-body massage',
        basePrice: 100,
        durationMinutes: 60,
        capacity: 1,
        extraItems: [
          { name: 'Hot Stone Therapy', price: 30, maxQuantity: 1 },
          { name: 'Aromatherapy', price: 20, maxQuantity: 1 },
        ],
      },
      {
        name: 'Deep Tissue Massage',
        description: 'Therapeutic deep tissue massage',
        basePrice: 120,
        durationMinutes: 90,
        capacity: 1,
      },
      {
        name: 'Facial Treatment',
        description: 'Rejuvenating facial with products',
        basePrice: 85,
        durationMinutes: 60,
        capacity: 1,
      },
    ],
  },
  {
    name: 'Downtown Dental Clinic',
    description: 'Family dentistry with modern equipment and friendly staff',
    address: '789 Medical Plaza, Chicago, IL 60601',
    timezone: 'America/Chicago',
    owner: {
      name: 'Dr. Emily Rodriguez',
      email: 'emily@downtowndental.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Routine Cleaning',
        description: 'Professional teeth cleaning and checkup',
        basePrice: 150,
        durationMinutes: 45,
        capacity: 1,
      },
      {
        name: 'Teeth Whitening',
        description: 'In-office teeth whitening treatment',
        basePrice: 350,
        durationMinutes: 90,
        capacity: 1,
      },
      {
        name: 'Dental Exam',
        description: 'Comprehensive dental examination',
        basePrice: 100,
        durationMinutes: 30,
        capacity: 1,
      },
    ],
  },
  {
    name: 'Elite Barber Shop',
    description: 'Classic and modern haircuts, beard trims, and grooming services',
    address: '321 Style Boulevard, Miami, FL 33101',
    timezone: 'America/New_York',
    owner: {
      name: 'James Wilson',
      email: 'james@elitebarber.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Classic Haircut',
        description: 'Traditional men\'s haircut',
        basePrice: 35,
        durationMinutes: 30,
        capacity: 1,
        extraItems: [
          { name: 'Beard Trim', price: 15, maxQuantity: 1 },
          { name: 'Hot Towel', price: 10, maxQuantity: 1 },
        ],
      },
      {
        name: 'Haircut & Beard',
        description: 'Complete grooming package',
        basePrice: 50,
        durationMinutes: 45,
        capacity: 1,
      },
      {
        name: 'Straight Razor Shave',
        description: 'Traditional straight razor shave',
        basePrice: 40,
        durationMinutes: 30,
        capacity: 1,
      },
    ],
  },
  {
    name: 'Beauty & Beyond',
    description: 'Full-service beauty salon offering hair, nails, and skincare',
    address: '654 Glamour Lane, Seattle, WA 98101',
    timezone: 'America/Los_Angeles',
    owner: {
      name: 'Amanda Lee',
      email: 'amanda@beautybeyond.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Manicure',
        description: 'Classic nail care and polish',
        basePrice: 40,
        durationMinutes: 45,
        capacity: 1,
        extraItems: [
          { name: 'Gel Polish', price: 15, maxQuantity: 1 },
          { name: 'Nail Art', price: 20, maxQuantity: 1 },
        ],
      },
      {
        name: 'Pedicure',
        description: 'Foot care and polish',
        basePrice: 50,
        durationMinutes: 60,
        capacity: 1,
      },
      {
        name: 'Hair Styling',
        description: 'Professional hair styling for special occasions',
        basePrice: 65,
        durationMinutes: 60,
        capacity: 1,
      },
    ],
  },
  {
    name: 'FitZone Personal Training',
    description: 'One-on-one personal training sessions and fitness coaching',
    address: '987 Fitness Drive, Austin, TX 78701',
    timezone: 'America/Chicago',
    owner: {
      name: 'David Martinez',
      email: 'david@fitzone.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Personal Training Session',
        description: 'One-on-one training with certified trainer',
        basePrice: 80,
        durationMinutes: 60,
        capacity: 1,
      },
      {
        name: 'Group Training',
        description: 'Small group training session (max 5 people)',
        basePrice: 35,
        durationMinutes: 60,
        capacity: 5,
      },
      {
        name: 'Nutrition Consultation',
        description: 'Personalized nutrition planning',
        basePrice: 100,
        durationMinutes: 45,
        capacity: 1,
      },
    ],
  },
  {
    name: 'Zen Yoga Studio',
    description: 'Yoga classes for all levels in a peaceful, welcoming environment',
    address: '147 Harmony Street, Portland, OR 97201',
    timezone: 'America/Los_Angeles',
    owner: {
      name: 'Lisa Thompson',
      email: 'lisa@zenyoga.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Vinyasa Flow',
        description: 'Dynamic flowing yoga class',
        basePrice: 20,
        durationMinutes: 60,
        capacity: 20,
      },
      {
        name: 'Hatha Yoga',
        description: 'Gentle yoga for beginners',
        basePrice: 18,
        durationMinutes: 60,
        capacity: 20,
      },
      {
        name: 'Hot Yoga',
        description: 'Yoga in heated room',
        basePrice: 25,
        durationMinutes: 90,
        capacity: 15,
      },
    ],
  },
  {
    name: 'The Nail Art Studio',
    description: 'Creative nail art, manicures, pedicures, and nail extensions',
    address: '258 Design Road, Denver, CO 80201',
    timezone: 'America/Denver',
    owner: {
      name: 'Jessica Park',
      email: 'jessica@nailartstudio.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Nail Art Design',
        description: 'Custom nail art and design',
        basePrice: 55,
        durationMinutes: 75,
        capacity: 1,
        extraItems: [
          { name: 'Rhinestones', price: 10, maxQuantity: 2 },
          { name: 'French Tips', price: 5, maxQuantity: 1 },
        ],
      },
      {
        name: 'Gel Manicure',
        description: 'Long-lasting gel polish manicure',
        basePrice: 45,
        durationMinutes: 60,
        capacity: 1,
      },
      {
        name: 'Nail Extensions',
        description: 'Acrylic or gel nail extensions',
        basePrice: 80,
        durationMinutes: 120,
        capacity: 1,
      },
    ],
  },
  {
    name: 'Massage Therapy Center',
    description: 'Therapeutic and relaxation massages by certified therapists',
    address: '369 Relief Way, Boston, MA 02101',
    timezone: 'America/New_York',
    owner: {
      name: 'Robert Brown',
      email: 'robert@massagetherapy.com',
      password: 'Password123!',
    },
    services: [
      {
        name: '60-Minute Massage',
        description: 'Full body relaxation massage',
        basePrice: 90,
        durationMinutes: 60,
        capacity: 1,
        extraItems: [
          { name: 'Hot Stones', price: 25, maxQuantity: 1 },
          { name: 'Aromatherapy', price: 15, maxQuantity: 1 },
        ],
      },
      {
        name: '90-Minute Massage',
        description: 'Extended full body massage',
        basePrice: 130,
        durationMinutes: 90,
        capacity: 1,
      },
      {
        name: 'Sports Massage',
        description: 'Therapeutic massage for athletes',
        basePrice: 100,
        durationMinutes: 60,
        capacity: 1,
      },
    ],
  },
  {
    name: 'Coastal Surf School',
    description: 'Learn to surf with experienced instructors on beautiful beaches',
    address: '741 Ocean Boulevard, San Diego, CA 92101',
    timezone: 'America/Los_Angeles',
    owner: {
      name: 'Jennifer Taylor',
      email: 'jennifer@coastalsurf.com',
      password: 'Password123!',
    },
    services: [
      {
        name: 'Beginner Surf Lesson',
        description: '2-hour lesson for first-time surfers',
        basePrice: 75,
        durationMinutes: 120,
        capacity: 4,
        extraItems: [
          { name: 'Wetsuit Rental', price: 15, maxQuantity: 1 },
          { name: 'Surfboard Rental', price: 20, maxQuantity: 1 },
        ],
      },
      {
        name: 'Intermediate Surf Lesson',
        description: 'Advanced techniques for experienced surfers',
        basePrice: 90,
        durationMinutes: 120,
        capacity: 3,
      },
      {
        name: 'Private Surf Lesson',
        description: 'One-on-one personalized instruction',
        basePrice: 150,
        durationMinutes: 120,
        capacity: 1,
      },
    ],
  },
]

// Mock customer users for bookings
const mockCustomers = [
  { name: 'John Doe', email: 'john.doe@example.com', password: 'Password123!' },
  { name: 'Jane Smith', email: 'jane.smith@example.com', password: 'Password123!' },
  { name: 'Mike Johnson', email: 'mike.johnson@example.com', password: 'Password123!' },
  { name: 'Sarah Williams', email: 'sarah.williams@example.com', password: 'Password123!' },
  { name: 'Tom Brown', email: 'tom.brown@example.com', password: 'Password123!' },
]

// Helper function to get future dates
function getFutureDate(daysFromNow: number): Date {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  date.setHours(0, 0, 0, 0)
  return date
}

async function main() {
  console.log('🌱 Starting seed process...')

  // Clear existing data
  console.log('🗑️  Cleaning existing data...')
  await prisma.bookingExtraItem.deleteMany()
  await prisma.booking.deleteMany()
  await prisma.availability.deleteMany()
  await prisma.extraItem.deleteMany()
  await prisma.service.deleteMany()
  await prisma.establishmentUser.deleteMany()
  await prisma.establishment.deleteMany()
  await prisma.user.deleteMany()

  console.log('👥 Creating owners and establishments...')
  const establishmentData: Array<{
    id: string
    ownerId: string
    services: Array<{ id: string; basePrice: number; extraItems: Array<{ id: string; price: number }> }>
  }> = []
  const ownerCredentials: Array<{ email: string; password: string; name: string }> = []

  for (const mockData of mockEstablishments) {
    // Hash password
    const passwordHash = await argon2.hash(mockData.owner.password, argon2Options)

    // Store credentials for display
    ownerCredentials.push({
      email: mockData.owner.email.toLowerCase(),
      password: mockData.owner.password,
      name: mockData.owner.name,
    })

    // Create user
    const user = await prisma.user.create({
      data: {
        email: mockData.owner.email.toLowerCase(),
        passwordHash,
        name: mockData.owner.name,
      },
    })

    // Create establishment with owner relationship
    const establishment = await prisma.establishment.create({
      data: {
        name: mockData.name,
        description: mockData.description,
        address: mockData.address,
        timezone: mockData.timezone,
        active: true,
        users: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
    })

    console.log(`✅ Created establishment: ${establishment.name}`)

    // Create services for this establishment
    console.log(`   📦 Creating ${mockData.services.length} services...`)
    const servicesData: Array<{ id: string; basePrice: number; extraItems: Array<{ id: string; price: number }> }> = []

    for (const serviceData of mockData.services) {
      const service = await prisma.service.create({
        data: {
          establishmentId: establishment.id,
          name: serviceData.name,
          description: serviceData.description,
          basePrice: new Prisma.Decimal(serviceData.basePrice),
          durationMinutes: serviceData.durationMinutes,
          capacity: serviceData.capacity ?? 1,
          active: true,
        },
      })

      // Create extra items for this service
      const extraItemsData: Array<{ id: string; price: number }> = []
      if (serviceData.extraItems && serviceData.extraItems.length > 0) {
        for (const extraItemData of serviceData.extraItems) {
          const extraItem = await prisma.extraItem.create({
            data: {
              serviceId: service.id,
              name: extraItemData.name,
              price: new Prisma.Decimal(extraItemData.price),
              maxQuantity: extraItemData.maxQuantity ?? 1,
              active: true,
            },
          })
          extraItemsData.push({ id: extraItem.id, price: extraItemData.price })
        }
      }

      servicesData.push({
        id: service.id,
        basePrice: serviceData.basePrice,
        extraItems: extraItemsData,
      })
    }

    establishmentData.push({
      id: establishment.id,
      ownerId: user.id,
      services: servicesData,
    })
  }

  console.log('\n📅 Creating availability slots...')
  let totalAvailabilities = 0

  for (const est of establishmentData) {
    for (const service of est.services) {
      // Create 5-7 availability slots for each service over the next 14 days
      const slotsPerService = 5 + Math.floor(Math.random() * 3)
      for (let i = 0; i < slotsPerService; i++) {
        const date = getFutureDate(i * 2 + Math.floor(Math.random() * 2))
        const startHour = 9 + Math.floor(Math.random() * 8) // Between 9 AM and 5 PM
        const startTime = `${startHour.toString().padStart(2, '0')}:00`
        const endHour = startHour + 1
        const endTime = `${endHour.toString().padStart(2, '0')}:00`
        const capacity = 5 + Math.floor(Math.random() * 10) // Capacity between 5-15

        await prisma.availability.create({
          data: {
            serviceId: service.id,
            date,
            startTime,
            endTime,
            capacity,
          },
        })
        totalAvailabilities++
      }
    }
  }

  console.log(`✅ Created ${totalAvailabilities} availability slots`)

  console.log('\n👤 Creating customer users...')
  const customerUsers: Array<{ id: string }> = []

  for (const customer of mockCustomers) {
    const passwordHash = await argon2.hash(customer.password, argon2Options)
    const user = await prisma.user.create({
      data: {
        email: customer.email.toLowerCase(),
        passwordHash,
        name: customer.name,
      },
    })
    customerUsers.push({ id: user.id })
  }

  console.log(`✅ Created ${customerUsers.length} customer users`)

  console.log('\n📝 Creating bookings...')
  let totalBookings = 0

  // Create 2-3 bookings per establishment
  for (const est of establishmentData) {
    const bookingsCount = 2 + Math.floor(Math.random() * 2)

    for (let i = 0; i < bookingsCount; i++) {
      // Pick a random service
      const service = est.services[Math.floor(Math.random() * est.services.length)]

      // Get availabilities for this service
      const availabilities = await prisma.availability.findMany({
        where: { serviceId: service.id },
        take: 10,
      })

      if (availabilities.length === 0) continue

      const availability = availabilities[Math.floor(Math.random() * availabilities.length)]

      // Pick a random customer
      const customer = customerUsers[Math.floor(Math.random() * customerUsers.length)]

      // Calculate total price
      let totalPrice = service.basePrice
      const extrasToAdd: Array<{ extraItemId: string; quantity: number; priceAtBooking: number }> = []

      // Randomly add extra items if available
      if (service.extraItems.length > 0 && Math.random() > 0.4) {
        // 60% chance of adding extras
        const extraItem = service.extraItems[Math.floor(Math.random() * service.extraItems.length)]
        const quantity = 1
        totalPrice += extraItem.price * quantity
        extrasToAdd.push({
          extraItemId: extraItem.id,
          quantity,
          priceAtBooking: extraItem.price,
        })
      }

      // Random booking status (mostly confirmed)
      const statuses: Array<'PENDING' | 'CONFIRMED' | 'CANCELLED'> = ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'PENDING', 'CANCELLED']
      const status = statuses[Math.floor(Math.random() * statuses.length)]

      // Create booking
      await prisma.booking.create({
        data: {
          userId: customer.id,
          establishmentId: est.id,
          serviceId: service.id,
          availabilityId: availability.id,
          quantity: 1,
          totalPrice: new Prisma.Decimal(totalPrice),
          status,
          extraItems: {
            create: extrasToAdd.map((e) => ({
              extraItemId: e.extraItemId,
              quantity: e.quantity,
              priceAtBooking: new Prisma.Decimal(e.priceAtBooking),
            })),
          },
        },
      })

      // Decrement availability capacity
      await prisma.availability.update({
        where: { id: availability.id },
        data: { capacity: { decrement: 1 } },
      })

      totalBookings++
    }
  }

  console.log(`✅ Created ${totalBookings} bookings`)

  const totalServices = establishmentData.reduce((sum, est) => sum + est.services.length, 0)
  console.log(`\n🎉 Successfully seeded:`)
  console.log(`   - ${mockEstablishments.length} establishments`)
  console.log(`   - ${mockEstablishments.length} owner users`)
  console.log(`   - ${totalServices} services`)
  console.log(`   - ${totalAvailabilities} availability slots`)
  console.log(`   - ${customerUsers.length} customer users`)
  console.log(`   - ${totalBookings} bookings`)
  console.log('\n📋 Login credentials:')
  console.log('\n   👑 Owners:')
  for (const owner of ownerCredentials) {
    console.log(`      ${owner.name}: ${owner.email} / ${owner.password}`)
  }
  console.log('\n   👤 Customers:')
  console.log('      <customer-email> / Password123!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

