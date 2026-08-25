import * as yup from 'yup'

export const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email address is required')
    .email('Please enter a valid email address')
    .test('sheshi-domain', 'Access Restricted: Only @sheshi.ai corporate email addresses are permitted', value =>
      Boolean(value?.trim().toLowerCase().endsWith('@sheshi.ai'))
    ),
  password: yup
    .string()
    .required('Password is required'),
})

export const registerSchema = yup.object({
  fullName: yup
    .string()
    .required('Full name is required')
    .min(2, 'Full name must be at least 2 characters'),
  email: yup
    .string()
    .required('Email address is required')
    .email('Please enter a valid email address')
    .test('sheshi-domain', 'Access Restricted: Only @sheshi.ai corporate email addresses are permitted', value =>
      Boolean(value?.trim().toLowerCase().endsWith('@sheshi.ai'))
    ),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
})

export const forgotSchema = yup.object({
  email: yup
    .string()
    .required('Email address is required')
    .email('Please enter a valid email address')
    .test('sheshi-domain', 'Access Restricted: Only @sheshi.ai corporate email addresses are permitted', value =>
      Boolean(value?.trim().toLowerCase().endsWith('@sheshi.ai'))
    ),
})

export const resetSchema = yup.object({
  password: yup
    .string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
})

export type LoginFormData = yup.InferType<typeof loginSchema>
export type RegisterFormData = yup.InferType<typeof registerSchema>
export type ForgotFormData = yup.InferType<typeof forgotSchema>
export type ResetFormData = yup.InferType<typeof resetSchema>
