import api from '../lib/api'

function extractFilenameFromContentDisposition(contentDisposition, fallbackFilename) {
  if (!contentDisposition) {
    return fallbackFilename
  }

  const utf8Match = contentDisposition.match(/filename\*\=UTF-8''([^;]+)/i)
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/(^"|"$)/g, ''))
    } catch {
      return fallbackFilename
    }
  }

  const filenameMatch = contentDisposition.match(/filename="([^"]+)"/i)
  if (filenameMatch?.[1]) {
    return filenameMatch[1]
  }

  const fallbackMatch = contentDisposition.match(/filename=([^;]+)/i)
  if (fallbackMatch?.[1]) {
    return fallbackMatch[1].replace(/(^"|"$)/g, '')
  }

  return fallbackFilename
}

async function extractErrorMessage(error) {
  const data = error?.response?.data

  if (data instanceof Blob) {
    const text = await data.text()
    if (!text) {
      return error?.message || 'Export failed'
    }

    try {
      const parsed = JSON.parse(text)
      return parsed?.detail?.message || parsed?.detail || parsed?.message || error?.message || 'Export failed'
    } catch {
      return text
    }
  }

  return (
    data?.detail?.message ||
    data?.detail ||
    data?.message ||
    error?.message ||
    'Export failed'
  )
}

export async function exportFormResponses({
  formId,
  format,
  formVersionId = null,
  fallbackFilenameBase = 'form',
}) {
  try {
    const response = await api.get(`/v1/forms/${formId}/responses/export`, {
      params: {
        format,
        form_version_id: formVersionId || undefined,
      },
      responseType: 'blob',
    })

    const contentDisposition = response.headers?.['content-disposition'] || response.headers?.['Content-Disposition']
    const fallbackFilename = `${fallbackFilenameBase}-responses.${format}`

    return {
      blob: response.data,
      filename: extractFilenameFromContentDisposition(contentDisposition, fallbackFilename),
      contentType: response.headers?.['content-type'] || response.headers?.['Content-Type'] || `application/${format}`,
    }
  } catch (error) {
    const message = await extractErrorMessage(error)
    const exportError = new Error(message)
    exportError.status = error?.response?.status
    throw exportError
  }
}
