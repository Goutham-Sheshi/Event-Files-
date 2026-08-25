import * as yup from 'yup'

export const resourceSchema = yup.object({
  productId: yup.string().required('Product selection is required'),
  type: yup
    .string()
    .oneOf(['logo', 'brochure', 'video', 'document', 'other'], 'Invalid file type')
    .required('File type is required'),
  title: yup.string().optional(),
  tags: yup.string().optional(),
  description: yup.string().optional(),
  videoUrl: yup.string().optional(),
})

export type ResourceFormData = yup.InferType<typeof resourceSchema>
