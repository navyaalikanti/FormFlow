import api from '../lib/api'

function extractErrorMessage(error) {
  return (
    error?.response?.data?.detail?.message ||
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.message ||
    'Upload failed'
  )
}

function buildMultipartRequest(files, validationRules = {}) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }
  if (validationRules && Object.keys(validationRules).length > 0) {
    formData.append('validation_rules', JSON.stringify(validationRules))
  }
  return formData
}

export async function uploadPublicFiles({
  linkToken,
  fieldKey,
  files,
  validationRules = {},
  onUploadProgress,
  signal,
}) {
  const response = await api.post(
    `/public/forms/${linkToken}/fields/${fieldKey}/files/upload`,
    buildMultipartRequest(files, validationRules),
    {
      signal,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }
  )

  return response.data
}

export async function deletePublicFile({ linkToken, fieldKey, fileKey }) {
  const response = await api.delete(
    `/public/forms/${linkToken}/fields/${fieldKey}/files/${fileKey}`
  )
  return response.data
}

export async function getPublicFileDownloadUrl({ linkToken, fieldKey, fileKey, expiresIn = 600, download = true }) {
  const response = await api.get(
    `/public/forms/${linkToken}/fields/${fieldKey}/files/${fileKey}`,
    {
      params: { expires_in: expiresIn, download },
    }
  )
  return response.data
}

export async function uploadAdminFiles({ files, validationRules = {}, onUploadProgress, signal }) {
  const response = await api.post(
    '/files/upload',
    buildMultipartRequest(files, validationRules),
    {
      signal,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    }
  )

  return response.data
}

export async function deleteAdminFile(fileKey) {
  const response = await api.delete(`/files/${fileKey}`)
  return response.data
}

export async function getAdminFileDownloadUrl(fileKey, expiresIn = 600, download = true) {
  const response = await api.get(`/files/${fileKey}`, {
    params: { expires_in: expiresIn, download },
  })
  return response.data
}

export { extractErrorMessage }
