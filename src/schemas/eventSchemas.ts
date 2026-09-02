import * as yup from 'yup'

export const eventSchema = yup.object({
  title: yup
    .string()
    .required('Event title is required')
    .min(3, 'Title must be at least 3 characters'),
  product_id: yup.string().nullable().optional(),
  event_date: yup
    .string()
    .required('Event date is required'),
  end_date: yup.string().nullable().optional(),
  location: yup.string().nullable().optional(),
  event_type: yup
    .string()
    .oneOf(['In-person', 'Virtual'], 'Invalid event type')
    .default('In-person')
    .required('Event type is required'),
  description: yup.string().nullable().optional(),
})

export type EventFormData = yup.InferType<typeof eventSchema>
