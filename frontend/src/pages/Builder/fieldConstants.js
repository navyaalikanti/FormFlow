/**
 * Field type metadata used on the frontend palette.
 * These colours + icons must match what the backend returns from /field-types.
 */
import {
  AlignLeft,
  Calendar,
  CheckSquare,
  ChevronDown,
  CircleDot,
  Clock,
  Globe,
  Hash,
  Layout,
  Mail,
  Phone,
  Star,
  Type,
  Upload,
} from 'lucide-react'

export const ICON_MAP = {
  Type,
  AlignLeft,
  Hash,
  Mail,
  Phone,
  Globe,
  ChevronDown,
  CircleDot,
  CheckSquare,
  Calendar,
  Clock,
  Star,
  Upload,
  Layout,
}

export const CATEGORY_LABELS = {
  basic: 'Basic Fields',
  choice: 'Choice Fields',
  date_time: 'Date & Time',
  advanced: 'Advanced',
  layout: 'Layout',
}

export const CATEGORY_ORDER = ['basic', 'choice', 'date_time', 'advanced', 'layout']

/** Field types that support options (dropdown / radio / checkbox) */
export const OPTION_FIELD_TYPES = new Set(['dropdown', 'radio', 'checkbox'])

/** Field types that are structural rather than data-collecting */
export const LAYOUT_FIELD_TYPES = new Set(['section'])
