import * as yup from 'yup'

export const adminResetPasswordSchema = yup.object({
  newPassword: yup
    .string()
    .required('New password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('newPassword')], 'Passwords do not match'),
})

export type AdminResetPasswordFormData = yup.InferType<typeof adminResetPasswordSchema>
