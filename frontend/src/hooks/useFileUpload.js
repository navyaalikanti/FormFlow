import { useEffect, useMemo, useRef, useState } from 'react'
import {
  deleteAdminFile,
  deletePublicFile,
  extractErrorMessage,
  getAdminFileDownloadUrl,
  getPublicFileDownloadUrl,
  uploadAdminFiles,
  uploadPublicFiles,
} from '../services/fileUploadService'

const DEFAULT_STATUS = 'idle'

function normalizeFileName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
}

function fileExtension(name) {
  const parts = String(name || '').split('.')
  if (parts.length < 2) return ''
  return parts.pop().toLowerCase()
}

function matchesMimeType(fileType, allowedType) {
  if (!allowedType) return true
  if (allowedType.endsWith('/*')) {
    return String(fileType || '').startsWith(allowedType.slice(0, -1))
  }
  return String(fileType || '') === allowedType
}

function getRules(field) {
  return field?.validation_rules || {}
}

function getFileCountLimit(rules) {
  return Number.isFinite(rules.max_file_count) ? rules.max_file_count : null
}

function getCountableItems(items, replaceTargetId = null) {
  return items.filter(
    (item) =>
      item &&
      item.id !== replaceTargetId &&
      (item.status === 'success' || item.status === 'uploading')
  )
}

function normalizeCommittedValue(value) {
  if (value === null || value === undefined || value === '') {
    return []
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeFileReference(item)).filter(Boolean)
  }

  const normalized = normalizeFileReference(value)
  return normalized ? [normalized] : []
}

function normalizeFileReference(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'object') {
    return String(
      value.file_key ||
        value.fileKey ||
        value.storage_key ||
        value.object_path ||
        value.value ||
        value.id ||
        value.name ||
        ''
    ).trim()
  }
  return String(value).trim()
}

function getFileKind(item) {
  const name = String(item?.name || '').toLowerCase()
  const contentType = String(item?.type || item?.contentType || '').toLowerCase()

  if (contentType.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(name)) {
    return 'image'
  }
  if (contentType === 'application/pdf' || name.endsWith('.pdf')) {
    return 'pdf'
  }
  if (contentType.includes('word') || /\.(doc|docx)$/i.test(name)) {
    return 'word'
  }
  if (
    contentType.includes('excel') ||
    contentType.includes('spreadsheet') ||
    /\.(xls|xlsx|csv)$/i.test(name)
  ) {
    return 'excel'
  }
  if (contentType.startsWith('text/') || /\.(txt|md|csv)$/i.test(name)) {
    return 'text'
  }
  return 'unsupported'
}

function createItem(file, { previewUrl = null, replaceTargetId = null } = {}) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    file,
    name: file?.name || 'file',
    size: file?.size || 0,
    type: file?.type || '',
    status: DEFAULT_STATUS,
    progress: 0,
    fileKey: null,
    error: null,
    previewUrl,
    signedDownloadUrl: null,
    contentType: file?.type || '',
    replaceTargetId,
    controller: null,
  }
}

function validateFileSelection(files, existingItems, field, replaceTargetId = null) {
  const rules = getRules(field)
  const errors = []
  const allowedTypes = rules.allowed_file_types || []
  const allowedExtensions = rules.allowed_extensions || []
  const maxCount = getFileCountLimit(rules)
  const minSizeBytes =
    rules.min_file_size_mb !== undefined && rules.min_file_size_mb !== null
      ? Number(rules.min_file_size_mb) * 1024 * 1024
      : null
  const maxSizeBytes =
    rules.max_file_size_mb !== undefined && rules.max_file_size_mb !== null
      ? Number(rules.max_file_size_mb) * 1024 * 1024
      : null

  const activeItems = getCountableItems(existingItems, replaceTargetId)
  const existingNames = new Set(
    activeItems
      .map((item) => normalizeFileName(item.name))
      .filter(Boolean)
  )
  const seenNames = new Set()

  const validFiles = []

  for (const file of files) {
    if (!file) {
      errors.push('One or more selected files are invalid.')
      continue
    }

    const normalizedName = normalizeFileName(file.name)
    const ext = fileExtension(file.name)

    if (!file.size) {
      errors.push(`${file.name || 'A file'} is empty and cannot be uploaded.`)
      continue
    }

    if (minSizeBytes !== null && file.size < minSizeBytes) {
      errors.push(
        rules.min_size_message ||
          `${file.name || 'A file'} must be at least ${rules.min_file_size_mb} MB.`
      )
      continue
    }

    if (maxSizeBytes !== null && file.size > maxSizeBytes) {
      errors.push(
        rules.max_size_message ||
          `${file.name || 'A file'} must not exceed ${rules.max_file_size_mb} MB.`
      )
      continue
    }

    if (allowedTypes.length > 0 && !allowedTypes.some((type) => matchesMimeType(file.type, type))) {
      errors.push(
        rules.file_type_message ||
          `${file.name || 'A file'} must be one of: ${allowedTypes.join(', ')}`
      )
      continue
    }

    if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
      errors.push(
        rules.extension_message ||
          `${file.name || 'A file'} must end with: ${allowedExtensions
            .map((extension) => `.${extension}`)
            .join(', ')}`
      )
      continue
    }

    if (seenNames.has(normalizedName)) {
      errors.push(`Duplicate filename "${file.name}" is not allowed in the same selection.`)
      continue
    }

    if (existingNames.has(normalizedName)) {
      errors.push(`"${file.name}" has already been added to this field.`)
      continue
    }

    seenNames.add(normalizedName)
    validFiles.push(file)
  }

  const currentCount = activeItems.length
  if (maxCount !== null && currentCount >= maxCount && replaceTargetId === null) {
    errors.push(
      rules.max_count_message || `Maximum of ${maxCount} files allowed.`
    )
    return { validFiles: [], errors }
  }

  if (maxCount !== null && currentCount + validFiles.length > maxCount) {
    errors.push(
      rules.max_count_message || `Maximum of ${maxCount} files allowed.`
    )
  }

  return {
    validFiles: maxCount !== null && currentCount + validFiles.length > maxCount ? [] : validFiles,
    errors,
  }
}

export function useFileUpload({
  field,
  linkToken,
  value,
  onChange,
  scope = 'public',
  disabled = false,
}) {
  const inputRef = useRef(null)
  const itemsRef = useRef([])
  const controllersRef = useRef(new Map())
  const objectUrlsRef = useRef(new Map())
  const pendingReplaceTargetRef = useRef(null)
  const [items, setItems] = useState([])
  const [selectionErrors, setSelectionErrors] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [pendingReplaceTargetId, setPendingReplaceTargetId] = useState(null)
  const committedValueRef = useRef([])
  const replaceSnapshotRef = useRef(null)

  const rules = useMemo(() => getRules(field), [field])
  const maxFileCount = getFileCountLimit(rules)
  const isMultiple = Boolean(
    field?.allows_multiple || maxFileCount > 1 || maxFileCount === null
  )

  useEffect(() => {
    const normalizedKeys = normalizeCommittedValue(value)
    const currentKeys = committedValueRef.current

    if (
      normalizedKeys.length === currentKeys.length &&
      normalizedKeys.every((key, index) => key === currentKeys[index])
    ) {
      return
    }

    committedValueRef.current = normalizedKeys

    if (normalizedKeys.length === 0) {
      itemsRef.current.forEach((item) => {
        if (item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl)
        }
      })
      setItemsSnapshot([])
      return
    }

    const nextItems = itemsRef.current.filter((item) => {
      if (item.status !== 'success') {
        return true
      }
      return item.fileKey ? normalizedKeys.includes(item.fileKey) : false
    })
    setItemsSnapshot(nextItems)
  }, [value])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => {
    return () => {
      controllersRef.current.forEach((controller) => controller?.abort?.())
      controllersRef.current.clear()
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      objectUrlsRef.current.clear()
    }
  }, [])

  const commitFormValue = (nextItems) => {
    if (!onChange) return
    const keys = nextItems
      .filter((item) => item.status === 'success' && item.fileKey)
      .map((item) => item.fileKey)
    committedValueRef.current = keys
    const nextValue = isMultiple || keys.length > 1 ? keys : keys[0] || ''
    onChange(nextValue)
  }

  const countableItems = getCountableItems(items)
  const maxReached = maxFileCount !== null && countableItems.length >= maxFileCount
  const maxCountMessage =
    maxFileCount !== null
      ? rules.max_count_message || `Maximum of ${maxFileCount} files allowed.`
      : null

  const setItemsSnapshot = (nextItems) => {
    itemsRef.current = nextItems
    setItems(nextItems)
    return nextItems
  }

  const updateItem = (itemId, updater) => {
    const nextItems = itemsRef.current.map((item) => (item.id === itemId ? updater(item) : item))
    return setItemsSnapshot(nextItems)
  }

  const removeItem = async (itemId, { skipBackendDelete = false, skipCommit = false } = {}) => {
    const target = itemsRef.current.find((item) => item.id === itemId)
    if (!target) return

    const previousItems = itemsRef.current
    const nextItems = previousItems.filter((item) => item.id !== itemId)
    setItemsSnapshot(nextItems)
    if (!skipCommit) {
      commitFormValue(nextItems)
    }

    if (target.status === 'uploading') {
      const controller = controllersRef.current.get(itemId)
      controller?.abort?.()
      controllersRef.current.delete(itemId)
    }

    if (target.status === 'success' && target.fileKey && !skipBackendDelete) {
      try {
        if (scope === 'public') {
          await deletePublicFile({
            linkToken,
            fieldKey: field.field_key,
            fileKey: target.fileKey,
          })
        } else {
          await deleteAdminFile(target.fileKey)
        }
      } catch (error) {
        setSelectionErrors([extractErrorMessage(error)])
        setItemsSnapshot(previousItems)
        if (!skipCommit) {
          commitFormValue(previousItems)
        }
        return
      }
    }

    if (target.previewUrl) {
      URL.revokeObjectURL(target.previewUrl)
    }
    controllersRef.current.delete(itemId)
  }

  const cancelUpload = async (itemId) => {
    const target = itemsRef.current.find((item) => item.id === itemId)
    if (!target) return
    const controller = controllersRef.current.get(itemId)
    controller?.abort?.()
    controllersRef.current.delete(itemId)

    updateItem(itemId, (item) => ({
      ...item,
      status: 'cancelled',
      controller: null,
      progress: 0,
      error: 'Upload cancelled',
    }))
  }

  const uploadItem = async (item) => {
    const controller = new AbortController()
    controllersRef.current.set(item.id, controller)

    updateItem(item.id, (current) => ({
      ...current,
      status: 'uploading',
      progress: 0,
      error: null,
      controller,
    }))

    try {
      const uploadFn = scope === 'public' ? uploadPublicFiles : uploadAdminFiles
      const response = await uploadFn({
        linkToken,
        fieldKey: field.field_key,
        files: [item.file],
        validationRules: rules,
        signal: controller.signal,
        onUploadProgress: (event) => {
          const total = event.total || item.file.size || 0
          const percentage = total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0
          updateItem(item.id, (current) => ({
            ...current,
            progress: percentage,
          }))
        },
      })

      const uploadedItem = response?.items?.[0] || null
      const uploadedKey = uploadedItem?.file_key || response?.file_keys?.[0] || ''
      const nextItems = updateItem(item.id, (current) => ({
        ...current,
        status: 'success',
        progress: 100,
        fileKey: uploadedKey,
        signedDownloadUrl: uploadedItem?.signed_download_url || current.signedDownloadUrl || null,
        name: uploadedItem?.original_name || current.name,
        size: uploadedItem?.size || current.size,
        type: uploadedItem?.content_type || current.type,
        contentType: uploadedItem?.content_type || current.contentType || current.type,
        controller: null,
        error: null,
      }))
      commitFormValue(nextItems)

      if (item.replaceTargetId) {
        const target = replaceSnapshotRef.current
        if (target?.id === item.replaceTargetId) {
          try {
            if (scope === 'public') {
              await deletePublicFile({
                linkToken,
                fieldKey: field.field_key,
                fileKey: target.fileKey,
              })
            } else {
              await deleteAdminFile(target.fileKey)
            }
            if (target.previewUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(target.previewUrl)
            }
          } catch (error) {
            setSelectionErrors([extractErrorMessage(error)])
          } finally {
            replaceSnapshotRef.current = null
          }
        }
      }
    } catch (error) {
      const message = error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED'
        ? 'Upload cancelled'
        : extractErrorMessage(error)
      updateItem(item.id, (current) => ({
        ...current,
        status: message === 'Upload cancelled' ? 'cancelled' : 'error',
        progress: 0,
        controller: null,
        error: message,
        fileKey: null,
      }))

      if (item.replaceTargetId && replaceSnapshotRef.current?.id === item.replaceTargetId) {
        if (item.previewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl)
        }
        const restored = itemsRef.current
          .filter((currentItem) => currentItem.id !== item.id)
          .concat(replaceSnapshotRef.current)
        setItemsSnapshot(restored)
        commitFormValue(restored)
        replaceSnapshotRef.current = null
      }
    } finally {
      controllersRef.current.delete(item.id)
    }
  }

  const enqueueFiles = async (fileList, { replaceTargetId = null } = {}) => {
    if (disabled || !field) return
    setSelectionErrors([])

    const files = Array.from(fileList || []).filter(Boolean)
    if (files.length === 0) return

    if (maxReached && replaceTargetId === null) {
      if (maxCountMessage) {
        setSelectionErrors([maxCountMessage])
      }
      return
    }

    const currentItems = itemsRef.current
    const targetForReplace = replaceTargetId
      ? currentItems.find((item) => item.id === replaceTargetId)
      : null
    const baseItems = targetForReplace
      ? currentItems.filter((item) => item.id !== replaceTargetId)
      : currentItems

    const { validFiles, errors } = validateFileSelection(files, baseItems, field, replaceTargetId)
    if (errors.length > 0) {
      setSelectionErrors(errors)
    }

    if (validFiles.length === 0) {
      return
    }

    if (targetForReplace) {
      replaceSnapshotRef.current = targetForReplace
      setItemsSnapshot(baseItems)
      commitFormValue(baseItems)
    }

    const newItems = validFiles.map((file) => {
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      if (previewUrl) {
        objectUrlsRef.current.set(file.name, previewUrl)
      }
      return createItem(file, { previewUrl, replaceTargetId })
    })

    setItemsSnapshot([...itemsRef.current, ...newItems])
    setIsBusy(true)

    for (const item of newItems) {
      // Upload each file independently so progress bars stay accurate.
      // eslint-disable-next-line no-await-in-loop
      await uploadItem(item)
    }

    setIsBusy(false)
  }

  const openPicker = (replaceTargetId = null) => {
    if (disabled) return
    if (replaceTargetId === null && maxReached) {
      if (maxCountMessage) {
        setSelectionErrors([maxCountMessage])
      }
      return
    }
    pendingReplaceTargetRef.current = replaceTargetId
    setPendingReplaceTargetId(replaceTargetId)
    inputRef.current?.click()
  }

  const handleInputChange = async (event) => {
    const selectedFiles = event.target.files
    if (!selectedFiles) return

    const replaceTargetId = pendingReplaceTargetRef.current || pendingReplaceTargetId
    await enqueueFiles(selectedFiles, { replaceTargetId })
    event.target.value = ''
    pendingReplaceTargetRef.current = null
    setPendingReplaceTargetId(null)
  }

  const handleDrop = async (event) => {
    event.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const droppedFiles = event.dataTransfer?.files
    if (!droppedFiles) return

    const replaceTargetId = pendingReplaceTargetRef.current || pendingReplaceTargetId
    await enqueueFiles(droppedFiles, { replaceTargetId })
    pendingReplaceTargetRef.current = null
    setPendingReplaceTargetId(null)
  }

  const fetchPreviewUrl = async (item) => {
    if (!item?.fileKey) return null
    if (item.signedDownloadUrl) return item.signedDownloadUrl

    try {
      const response =
        scope === 'public'
          ? await getPublicFileDownloadUrl({
              linkToken,
              fieldKey: field.field_key,
              fileKey: item.fileKey,
              download: false,
            })
          : await getAdminFileDownloadUrl(item.fileKey, 600, false)

      const signedDownloadUrl = response?.signed_download_url || response?.signedDownloadUrl || response?.signedUrl || response?.signedURL || null
      if (signedDownloadUrl) {
        updateItem(item.id, (current) => ({
          ...current,
          signedDownloadUrl,
        }))
      }
      return signedDownloadUrl
    } catch (error) {
      setSelectionErrors([extractErrorMessage(error)])
      return null
    }
  }

  const retryUpload = async (itemId) => {
    const target = itemsRef.current.find((item) => item.id === itemId)
    if (!target) return
    await uploadItem(target)
  }

  const accept = useMemo(() => {
    const accepted = []
    for (const mime of rules.allowed_file_types || []) {
      accepted.push(mime)
    }
    for (const ext of rules.allowed_extensions || []) {
      accepted.push(`.${String(ext).replace(/^\./, '')}`)
    }
    return accepted.join(',')
  }, [rules.allowed_extensions, rules.allowed_file_types])

  const uploadedItems = items.filter((item) => item.status === 'success')
  const pendingItems = items.filter((item) => item.status === 'uploading')

  return {
    items,
    uploadedItems,
    pendingItems,
    selectionErrors,
    isDragging,
    isBusy,
    maxReached,
    maxCountMessage,
    inputRef,
    accept,
    openPicker,
    handleInputChange,
    handleDrop,
    setIsDragging,
    removeItem,
    cancelUpload,
    retryUpload,
    fetchPreviewUrl,
    isMultiple,
    rules,
    normalizeFileName,
    pendingReplaceTargetId,
    setPendingReplaceTargetId,
  }
}
