import api from '../lib/api'

export async function changePassword(currentPassword, newPassword) {
  const response = await api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  })
  return response.data
}

export async function deleteAccount() {
  const response = await api.delete('/auth/me')
  return response.data
}
