import { story } from 'maltty/stories'
import { z } from 'zod'

import type { UserCardProps } from './UserCard'
import { UserCard } from './UserCard'

const schema = z.object({
  username: z.string().describe('Display name'),
  role: z.enum(['admin', 'editor', 'viewer']).describe('User role'),
  email: z.string().describe('Email address'),
  active: z.boolean().describe('Whether the account is active'),
  loginCount: z.number().describe('Total login count'),
})

export default story<UserCardProps>({
  name: 'UserCard',
  component: UserCard,
  schema,
  props: {
    username: 'zac',
    role: 'admin',
    email: 'zac@example.com',
    active: true,
    loginCount: 42,
  },
  description: 'A user info card with multiple prop types',
})
