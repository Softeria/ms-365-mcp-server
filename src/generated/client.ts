import { makeApi, Zodios, type ZodiosOptions } from './hack.js';
import { z } from 'zod';

type microsoft_graph_accessPackage = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    isHidden: boolean | null;
    modifiedDateTime: string | null;
    accessPackagesIncompatibleWith: Array<microsoft_graph_accessPackage>;
    assignmentPolicies: Array<microsoft_graph_accessPackageAssignmentPolicy>;
    catalog:
      | (microsoft_graph_accessPackageCatalog | {})
      | Array<microsoft_graph_accessPackageCatalog | {}>;
    incompatibleAccessPackages: Array<microsoft_graph_accessPackage>;
    incompatibleGroups: Array<microsoft_graph_group>;
    resourceRoleScopes: Array<microsoft_graph_accessPackageResourceRoleScope>;
  }>;
type microsoft_graph_entity = Partial<{
  id: string;
}>;
type microsoft_graph_allowedTargetScope =
  | 'notSpecified'
  | 'specificDirectoryUsers'
  | 'specificConnectedOrganizationUsers'
  | 'specificDirectoryServicePrincipals'
  | 'allMemberUsers'
  | 'allDirectoryUsers'
  | 'allDirectoryServicePrincipals'
  | 'allConfiguredConnectedOrganizationUsers'
  | 'allExternalUsers'
  | 'unknownFutureValue';
type microsoft_graph_accessPackageAutomaticRequestSettings = Partial<{
  gracePeriodBeforeAccessRemoval: string | null;
  removeAccessWhenTargetLeavesAllowedTargets: boolean | null;
  requestAccessForAllowedTargets: boolean | null;
}>;
type microsoft_graph_expirationPattern = Partial<{
  duration: string | null;
  endDateTime: string | null;
  type:
    | (microsoft_graph_expirationPatternType | {})
    | Array<microsoft_graph_expirationPatternType | {}>;
}>;
type microsoft_graph_expirationPatternType =
  | 'notSpecified'
  | 'noExpiration'
  | 'afterDateTime'
  | 'afterDuration';
type microsoft_graph_accessPackageNotificationSettings = Partial<{
  isAssignmentNotificationDisabled: boolean;
}>;
type microsoft_graph_accessPackageAssignmentApprovalSettings = Partial<{
  isApprovalRequiredForAdd: boolean | null;
  isApprovalRequiredForUpdate: boolean | null;
  isRequestorJustificationRequired: boolean | null;
  stages: Array<microsoft_graph_accessPackageApprovalStage>;
}>;
type microsoft_graph_accessPackageApprovalStage = Partial<{
  durationBeforeAutomaticDenial: string | null;
  durationBeforeEscalation: string | null;
  escalationApprovers: Array<microsoft_graph_subjectSet>;
  fallbackEscalationApprovers: Array<microsoft_graph_subjectSet>;
  fallbackPrimaryApprovers: Array<microsoft_graph_subjectSet>;
  isApproverJustificationRequired: boolean | null;
  isEscalationEnabled: boolean | null;
  primaryApprovers: Array<microsoft_graph_subjectSet>;
}>;
type microsoft_graph_subjectSet = Partial<{}>;
type microsoft_graph_accessPackageAssignmentRequestorSettings = Partial<{
  allowCustomAssignmentSchedule: boolean | null;
  enableOnBehalfRequestorsToAddAccess: boolean | null;
  enableOnBehalfRequestorsToRemoveAccess: boolean | null;
  enableOnBehalfRequestorsToUpdateAccess: boolean | null;
  enableTargetsToSelfAddAccess: boolean | null;
  enableTargetsToSelfRemoveAccess: boolean | null;
  enableTargetsToSelfUpdateAccess: boolean | null;
  onBehalfRequestors: Array<microsoft_graph_subjectSet>;
}>;
type microsoft_graph_accessPackageAssignmentReviewSettings = Partial<{
  expirationBehavior:
    | (microsoft_graph_accessReviewExpirationBehavior | {})
    | Array<microsoft_graph_accessReviewExpirationBehavior | {}>;
  fallbackReviewers: Array<microsoft_graph_subjectSet>;
  isEnabled: boolean | null;
  isRecommendationEnabled: boolean | null;
  isReviewerJustificationRequired: boolean | null;
  isSelfReview: boolean | null;
  primaryReviewers: Array<microsoft_graph_subjectSet>;
  schedule:
    | (microsoft_graph_entitlementManagementSchedule | {})
    | Array<microsoft_graph_entitlementManagementSchedule | {}>;
}>;
type microsoft_graph_accessReviewExpirationBehavior =
  | 'keepAccess'
  | 'removeAccess'
  | 'acceptAccessRecommendation'
  | 'unknownFutureValue';
type microsoft_graph_entitlementManagementSchedule = Partial<{
  expiration:
    | (microsoft_graph_expirationPattern | {})
    | Array<microsoft_graph_expirationPattern | {}>;
  recurrence:
    | (microsoft_graph_patternedRecurrence | {})
    | Array<microsoft_graph_patternedRecurrence | {}>;
  startDateTime: string | null;
}>;
type microsoft_graph_patternedRecurrence = Partial<{
  pattern: (microsoft_graph_recurrencePattern | {}) | Array<microsoft_graph_recurrencePattern | {}>;
  range: (microsoft_graph_recurrenceRange | {}) | Array<microsoft_graph_recurrenceRange | {}>;
}>;
type microsoft_graph_recurrencePattern = Partial<{
  dayOfMonth: number;
  daysOfWeek: Array<(microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>>;
  firstDayOfWeek: (microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>;
  index: (microsoft_graph_weekIndex | {}) | Array<microsoft_graph_weekIndex | {}>;
  interval: number;
  month: number;
  type:
    | (microsoft_graph_recurrencePatternType | {})
    | Array<microsoft_graph_recurrencePatternType | {}>;
}>;
type microsoft_graph_dayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday';
type microsoft_graph_weekIndex = 'first' | 'second' | 'third' | 'fourth' | 'last';
type microsoft_graph_recurrencePatternType =
  | 'daily'
  | 'weekly'
  | 'absoluteMonthly'
  | 'relativeMonthly'
  | 'absoluteYearly'
  | 'relativeYearly';
type microsoft_graph_recurrenceRange = Partial<{
  endDate: string | null;
  numberOfOccurrences: number;
  recurrenceTimeZone: string | null;
  startDate: string | null;
  type:
    | (microsoft_graph_recurrenceRangeType | {})
    | Array<microsoft_graph_recurrenceRangeType | {}>;
}>;
type microsoft_graph_recurrenceRangeType = 'endDate' | 'noEnd' | 'numbered';
type microsoft_graph_accessPackageCatalogType =
  | 'userManaged'
  | 'serviceDefault'
  | 'serviceManaged'
  | 'unknownFutureValue';
type microsoft_graph_accessPackageCatalogState = 'unpublished' | 'published' | 'unknownFutureValue';
type microsoft_graph_customCalloutExtension = microsoft_graph_entity &
  Partial<{
    authenticationConfiguration:
      | (microsoft_graph_customExtensionAuthenticationConfiguration | {})
      | Array<microsoft_graph_customExtensionAuthenticationConfiguration | {}>;
    clientConfiguration:
      | (microsoft_graph_customExtensionClientConfiguration | {})
      | Array<microsoft_graph_customExtensionClientConfiguration | {}>;
    description: string | null;
    displayName: string | null;
    endpointConfiguration:
      | (microsoft_graph_customExtensionEndpointConfiguration | {})
      | Array<microsoft_graph_customExtensionEndpointConfiguration | {}>;
  }>;
type microsoft_graph_customExtensionAuthenticationConfiguration = Partial<{}>;
type microsoft_graph_customExtensionClientConfiguration = Partial<{
  maximumRetries: number | null;
  timeoutInMilliseconds: number | null;
}>;
type microsoft_graph_customExtensionEndpointConfiguration = Partial<{}>;
type microsoft_graph_accessPackageResourceAttribute = Partial<{
  destination:
    | (microsoft_graph_accessPackageResourceAttributeDestination | {})
    | Array<microsoft_graph_accessPackageResourceAttributeDestination | {}>;
  isEditable: boolean | null;
  isPersistedOnAssignmentRemoval: boolean | null;
  name: string | null;
  source:
    | (microsoft_graph_accessPackageResourceAttributeSource | {})
    | Array<microsoft_graph_accessPackageResourceAttributeSource | {}>;
}>;
type microsoft_graph_accessPackageResourceAttributeDestination = Partial<{}>;
type microsoft_graph_accessPackageResourceAttributeSource = Partial<{}>;
type microsoft_graph_connectionInfo = Partial<{
  url: string | null;
}>;
type microsoft_graph_customExtensionStageSetting = microsoft_graph_entity &
  Partial<{
    stage: microsoft_graph_accessPackageCustomExtensionStage;
    customExtension:
      | (microsoft_graph_customCalloutExtension | {})
      | Array<microsoft_graph_customCalloutExtension | {}>;
  }>;
type microsoft_graph_accessPackageCustomExtensionStage =
  | 'assignmentRequestCreated'
  | 'assignmentRequestApproved'
  | 'assignmentRequestGranted'
  | 'assignmentRequestRemoved'
  | 'assignmentFourteenDaysBeforeExpiration'
  | 'assignmentOneDayBeforeExpiration'
  | 'unknownFutureValue';
type microsoft_graph_accessPackageQuestion = microsoft_graph_entity &
  Partial<{
    isAnswerEditable: boolean | null;
    isRequired: boolean | null;
    localizations: Array<microsoft_graph_accessPackageLocalizedText>;
    sequence: number | null;
    text: string | null;
  }>;
type microsoft_graph_accessPackageLocalizedText = Partial<{
  languageCode: string;
  text: string | null;
}>;
type microsoft_graph_directoryObject = microsoft_graph_entity &
  Partial<{
    deletedDateTime: string | null;
  }>;
type microsoft_graph_assignedLabel = Partial<{
  displayName: string | null;
  labelId: string | null;
}>;
type microsoft_graph_assignedLicense = Partial<{
  disabledPlans: Array<string>;
  skuId: string | null;
}>;
type microsoft_graph_licenseProcessingState = Partial<{
  state: string | null;
}>;
type microsoft_graph_onPremisesProvisioningError = Partial<{
  category: string | null;
  occurredDateTime: string | null;
  propertyCausingError: string | null;
  value: string | null;
}>;
type microsoft_graph_serviceProvisioningError = Partial<{
  createdDateTime: string | null;
  isResolved: boolean | null;
  serviceInstance: string | null;
}>;
type microsoft_graph_appRoleAssignment = microsoft_graph_directoryObject &
  Partial<{
    appRoleId: string;
    createdDateTime: string | null;
    principalDisplayName: string | null;
    principalId: string | null;
    principalType: string | null;
    resourceDisplayName: string | null;
    resourceId: string | null;
  }>;
type microsoft_graph_onlineMeetingProviderType =
  | 'unknown'
  | 'skypeForBusiness'
  | 'skypeForConsumer'
  | 'teamsForBusiness';
type microsoft_graph_calendarColor =
  | 'auto'
  | 'lightBlue'
  | 'lightGreen'
  | 'lightOrange'
  | 'lightGray'
  | 'lightYellow'
  | 'lightTeal'
  | 'lightPink'
  | 'lightBrown'
  | 'lightRed'
  | 'maxColor';
type microsoft_graph_emailAddress = Partial<{
  address: string | null;
  name: string | null;
}>;
type microsoft_graph_calendarPermission = microsoft_graph_entity &
  Partial<{
    allowedRoles: Array<
      (microsoft_graph_calendarRoleType | {}) | Array<microsoft_graph_calendarRoleType | {}>
    >;
    emailAddress: (microsoft_graph_emailAddress | {}) | Array<microsoft_graph_emailAddress | {}>;
    isInsideOrganization: boolean | null;
    isRemovable: boolean | null;
    role: (microsoft_graph_calendarRoleType | {}) | Array<microsoft_graph_calendarRoleType | {}>;
  }>;
type microsoft_graph_calendarRoleType =
  | 'none'
  | 'freeBusyRead'
  | 'limitedRead'
  | 'read'
  | 'write'
  | 'delegateWithoutPrivateEventAccess'
  | 'delegateWithPrivateEventAccess'
  | 'custom';
type microsoft_graph_outlookItem = microsoft_graph_entity &
  Partial<{
    categories: Array<string | null>;
    changeKey: string | null;
    createdDateTime: string | null;
    lastModifiedDateTime: string | null;
  }>;
type microsoft_graph_attendee = microsoft_graph_attendeeBase &
  Partial<{
    proposedNewTime: (microsoft_graph_timeSlot | {}) | Array<microsoft_graph_timeSlot | {}>;
    status: (microsoft_graph_responseStatus | {}) | Array<microsoft_graph_responseStatus | {}>;
  }>;
type microsoft_graph_attendeeBase = microsoft_graph_recipient &
  Partial<{
    type: (microsoft_graph_attendeeType | {}) | Array<microsoft_graph_attendeeType | {}>;
  }>;
type microsoft_graph_recipient = Partial<{
  emailAddress: (microsoft_graph_emailAddress | {}) | Array<microsoft_graph_emailAddress | {}>;
}>;
type microsoft_graph_attendeeType = 'required' | 'optional' | 'resource';
type microsoft_graph_timeSlot = Partial<{
  end: microsoft_graph_dateTimeTimeZone;
  start: microsoft_graph_dateTimeTimeZone;
}>;
type microsoft_graph_dateTimeTimeZone = Partial<{
  dateTime: string;
  timeZone: string | null;
}>;
type microsoft_graph_responseStatus = Partial<{
  response: (microsoft_graph_responseType | {}) | Array<microsoft_graph_responseType | {}>;
  time: string | null;
}>;
type microsoft_graph_responseType =
  | 'none'
  | 'organizer'
  | 'tentativelyAccepted'
  | 'accepted'
  | 'declined'
  | 'notResponded';
type microsoft_graph_itemBody = Partial<{
  content: string | null;
  contentType: (microsoft_graph_bodyType | {}) | Array<microsoft_graph_bodyType | {}>;
}>;
type microsoft_graph_bodyType = 'text' | 'html';
type microsoft_graph_importance = 'low' | 'normal' | 'high';
type microsoft_graph_location = Partial<{
  address: (microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>;
  coordinates:
    | (microsoft_graph_outlookGeoCoordinates | {})
    | Array<microsoft_graph_outlookGeoCoordinates | {}>;
  displayName: string | null;
  locationEmailAddress: string | null;
  locationType: (microsoft_graph_locationType | {}) | Array<microsoft_graph_locationType | {}>;
  locationUri: string | null;
  uniqueId: string | null;
  uniqueIdType:
    | (microsoft_graph_locationUniqueIdType | {})
    | Array<microsoft_graph_locationUniqueIdType | {}>;
}>;
type microsoft_graph_physicalAddress = Partial<{
  city: string | null;
  countryOrRegion: string | null;
  postalCode: string | null;
  state: string | null;
  street: string | null;
}>;
type microsoft_graph_outlookGeoCoordinates = Partial<{
  accuracy: (number | null) | (string | null) | ReferenceNumeric;
  altitude: (number | null) | (string | null) | ReferenceNumeric;
  altitudeAccuracy: (number | null) | (string | null) | ReferenceNumeric;
  latitude: (number | null) | (string | null) | ReferenceNumeric;
  longitude: (number | null) | (string | null) | ReferenceNumeric;
}>;
type ReferenceNumeric = '-INF' | 'INF' | 'NaN' | null;
type microsoft_graph_locationType =
  | 'default'
  | 'conferenceRoom'
  | 'homeAddress'
  | 'businessAddress'
  | 'geoCoordinates'
  | 'streetAddress'
  | 'hotel'
  | 'restaurant'
  | 'localBusiness'
  | 'postalAddress';
type microsoft_graph_locationUniqueIdType =
  | 'unknown'
  | 'locationStore'
  | 'directory'
  | 'private'
  | 'bing';
type microsoft_graph_onlineMeetingInfo = Partial<{
  conferenceId: string | null;
  joinUrl: string | null;
  phones: Array<microsoft_graph_phone>;
  quickDial: string | null;
  tollFreeNumbers: Array<string | null>;
  tollNumber: string | null;
}>;
type microsoft_graph_phone = Partial<{
  language: string | null;
  number: string | null;
  region: string | null;
  type: (microsoft_graph_phoneType | {}) | Array<microsoft_graph_phoneType | {}>;
}>;
type microsoft_graph_phoneType =
  | 'home'
  | 'business'
  | 'mobile'
  | 'other'
  | 'assistant'
  | 'homeFax'
  | 'businessFax'
  | 'otherFax'
  | 'pager'
  | 'radio';
type microsoft_graph_sensitivity = 'normal' | 'personal' | 'private' | 'confidential';
type microsoft_graph_freeBusyStatus =
  | 'unknown'
  | 'free'
  | 'tentative'
  | 'busy'
  | 'oof'
  | 'workingElsewhere';
type microsoft_graph_eventType = 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
type microsoft_graph_attachment = microsoft_graph_entity &
  Partial<{
    contentType: string | null;
    isInline: boolean;
    lastModifiedDateTime: string | null;
    name: string | null;
    size: number;
  }>;
type microsoft_graph_extension = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_multiValueLegacyExtendedProperty = microsoft_graph_entity &
  Partial<{
    value: Array<string | null>;
  }>;
type microsoft_graph_singleValueLegacyExtendedProperty = microsoft_graph_entity &
  Partial<{
    value: string | null;
  }>;
type microsoft_graph_conversation = microsoft_graph_entity &
  Partial<{
    hasAttachments: boolean;
    lastDeliveredDateTime: string;
    preview: string;
    topic: string;
    uniqueSenders: Array<string>;
    threads: Array<microsoft_graph_conversationThread>;
  }>;
type microsoft_graph_conversationThread = microsoft_graph_entity &
  Partial<{
    ccRecipients: Array<microsoft_graph_recipient>;
    hasAttachments: boolean;
    isLocked: boolean;
    lastDeliveredDateTime: string;
    preview: string;
    topic: string;
    toRecipients: Array<microsoft_graph_recipient>;
    uniqueSenders: Array<string>;
    posts: Array<microsoft_graph_post>;
  }>;
type microsoft_graph_identitySet = Partial<{
  application: (microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>;
  device: (microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>;
  user: (microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>;
}>;
type microsoft_graph_identity = Partial<{
  displayName: string | null;
  id: string | null;
}>;
type microsoft_graph_itemReference = Partial<{
  driveId: string | null;
  driveType: string | null;
  id: string | null;
  name: string | null;
  path: string | null;
  shareId: string | null;
  sharepointIds: (microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>;
  siteId: string | null;
}>;
type microsoft_graph_sharepointIds = Partial<{
  listId: string | null;
  listItemId: string | null;
  listItemUniqueId: string | null;
  siteId: string | null;
  siteUrl: string | null;
  tenantId: string | null;
  webId: string | null;
}>;
type microsoft_graph_assignedPlan = Partial<{
  assignedDateTime: string | null;
  capabilityStatus: string | null;
  service: string | null;
  servicePlanId: string | null;
}>;
type microsoft_graph_authorizationInfo = Partial<{
  certificateUserIds: Array<string | null>;
}>;
type microsoft_graph_customSecurityAttributeValue = Partial<{}>;
type microsoft_graph_employeeOrgData = Partial<{
  costCenter: string | null;
  division: string | null;
}>;
type microsoft_graph_objectIdentity = Partial<{
  issuer: string | null;
  issuerAssignedId: string | null;
  signInType: string | null;
}>;
type microsoft_graph_licenseAssignmentState = Partial<{
  assignedByGroup: string | null;
  disabledPlans: Array<string | null>;
  error: string | null;
  lastUpdatedDateTime: string | null;
  skuId: string | null;
  state: string | null;
}>;
type microsoft_graph_mailboxSettings = Partial<{
  archiveFolder: string | null;
  automaticRepliesSetting:
    | (microsoft_graph_automaticRepliesSetting | {})
    | Array<microsoft_graph_automaticRepliesSetting | {}>;
  dateFormat: string | null;
  delegateMeetingMessageDeliveryOptions:
    | (microsoft_graph_delegateMeetingMessageDeliveryOptions | {})
    | Array<microsoft_graph_delegateMeetingMessageDeliveryOptions | {}>;
  language: (microsoft_graph_localeInfo | {}) | Array<microsoft_graph_localeInfo | {}>;
  timeFormat: string | null;
  timeZone: string | null;
  userPurpose: (microsoft_graph_userPurpose | {}) | Array<microsoft_graph_userPurpose | {}>;
  workingHours: (microsoft_graph_workingHours | {}) | Array<microsoft_graph_workingHours | {}>;
}>;
type microsoft_graph_automaticRepliesSetting = Partial<{
  externalAudience:
    | (microsoft_graph_externalAudienceScope | {})
    | Array<microsoft_graph_externalAudienceScope | {}>;
  externalReplyMessage: string | null;
  internalReplyMessage: string | null;
  scheduledEndDateTime:
    | (microsoft_graph_dateTimeTimeZone | {})
    | Array<microsoft_graph_dateTimeTimeZone | {}>;
  scheduledStartDateTime:
    | (microsoft_graph_dateTimeTimeZone | {})
    | Array<microsoft_graph_dateTimeTimeZone | {}>;
  status:
    | (microsoft_graph_automaticRepliesStatus | {})
    | Array<microsoft_graph_automaticRepliesStatus | {}>;
}>;
type microsoft_graph_externalAudienceScope = 'none' | 'contactsOnly' | 'all';
type microsoft_graph_automaticRepliesStatus = 'disabled' | 'alwaysEnabled' | 'scheduled';
type microsoft_graph_delegateMeetingMessageDeliveryOptions =
  | 'sendToDelegateAndInformationToPrincipal'
  | 'sendToDelegateAndPrincipal'
  | 'sendToDelegateOnly';
type microsoft_graph_localeInfo = Partial<{
  displayName: string | null;
  locale: string | null;
}>;
type microsoft_graph_userPurpose =
  | 'user'
  | 'linked'
  | 'shared'
  | 'room'
  | 'equipment'
  | 'others'
  | 'unknownFutureValue';
type microsoft_graph_workingHours = Partial<{
  daysOfWeek: Array<(microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>>;
  endTime: string | null;
  startTime: string | null;
  timeZone: (microsoft_graph_timeZoneBase | {}) | Array<microsoft_graph_timeZoneBase | {}>;
}>;
type microsoft_graph_timeZoneBase = Partial<{
  name: string | null;
}>;
type microsoft_graph_onPremisesExtensionAttributes = Partial<{
  extensionAttribute1: string | null;
  extensionAttribute10: string | null;
  extensionAttribute11: string | null;
  extensionAttribute12: string | null;
  extensionAttribute13: string | null;
  extensionAttribute14: string | null;
  extensionAttribute15: string | null;
  extensionAttribute2: string | null;
  extensionAttribute3: string | null;
  extensionAttribute4: string | null;
  extensionAttribute5: string | null;
  extensionAttribute6: string | null;
  extensionAttribute7: string | null;
  extensionAttribute8: string | null;
  extensionAttribute9: string | null;
}>;
type microsoft_graph_passwordProfile = Partial<{
  forceChangePasswordNextSignIn: boolean | null;
  forceChangePasswordNextSignInWithMfa: boolean | null;
  password: string | null;
}>;
type microsoft_graph_printerBase = microsoft_graph_entity &
  Partial<{
    capabilities:
      | (microsoft_graph_printerCapabilities | {})
      | Array<microsoft_graph_printerCapabilities | {}>;
    defaults: (microsoft_graph_printerDefaults | {}) | Array<microsoft_graph_printerDefaults | {}>;
    displayName: string;
    isAcceptingJobs: boolean | null;
    location: (microsoft_graph_printerLocation | {}) | Array<microsoft_graph_printerLocation | {}>;
    manufacturer: string | null;
    model: string | null;
    status: microsoft_graph_printerStatus;
    jobs: Array<microsoft_graph_printJob>;
  }>;
type microsoft_graph_printerCapabilities = Partial<{
  bottomMargins: Array<number | null>;
  collation: boolean | null;
  colorModes: Array<
    (microsoft_graph_printColorMode | {}) | Array<microsoft_graph_printColorMode | {}>
  >;
  contentTypes: Array<string | null>;
  copiesPerJob: (microsoft_graph_integerRange | {}) | Array<microsoft_graph_integerRange | {}>;
  dpis: Array<number | null>;
  duplexModes: Array<
    (microsoft_graph_printDuplexMode | {}) | Array<microsoft_graph_printDuplexMode | {}>
  >;
  feedOrientations: Array<
    | (microsoft_graph_printerFeedOrientation | {})
    | Array<microsoft_graph_printerFeedOrientation | {}>
  >;
  finishings: Array<
    (microsoft_graph_printFinishing | {}) | Array<microsoft_graph_printFinishing | {}>
  >;
  inputBins: Array<string | null>;
  isColorPrintingSupported: boolean | null;
  isPageRangeSupported: boolean | null;
  leftMargins: Array<number | null>;
  mediaColors: Array<string | null>;
  mediaSizes: Array<string | null>;
  mediaTypes: Array<string | null>;
  multipageLayouts: Array<
    (microsoft_graph_printMultipageLayout | {}) | Array<microsoft_graph_printMultipageLayout | {}>
  >;
  orientations: Array<
    (microsoft_graph_printOrientation | {}) | Array<microsoft_graph_printOrientation | {}>
  >;
  outputBins: Array<string | null>;
  pagesPerSheet: Array<number | null>;
  qualities: Array<(microsoft_graph_printQuality | {}) | Array<microsoft_graph_printQuality | {}>>;
  rightMargins: Array<number | null>;
  scalings: Array<(microsoft_graph_printScaling | {}) | Array<microsoft_graph_printScaling | {}>>;
  supportsFitPdfToPage: boolean | null;
  topMargins: Array<number | null>;
}>;
type microsoft_graph_printColorMode =
  | 'blackAndWhite'
  | 'grayscale'
  | 'color'
  | 'auto'
  | 'unknownFutureValue';
type microsoft_graph_integerRange = Partial<{
  end: number | null;
  start: number | null;
}>;
type microsoft_graph_printDuplexMode =
  | 'flipOnLongEdge'
  | 'flipOnShortEdge'
  | 'oneSided'
  | 'unknownFutureValue';
type microsoft_graph_printerFeedOrientation =
  | 'longEdgeFirst'
  | 'shortEdgeFirst'
  | 'unknownFutureValue';
type microsoft_graph_printFinishing =
  | 'none'
  | 'staple'
  | 'punch'
  | 'cover'
  | 'bind'
  | 'saddleStitch'
  | 'stitchEdge'
  | 'stapleTopLeft'
  | 'stapleBottomLeft'
  | 'stapleTopRight'
  | 'stapleBottomRight'
  | 'stitchLeftEdge'
  | 'stitchTopEdge'
  | 'stitchRightEdge'
  | 'stitchBottomEdge'
  | 'stapleDualLeft'
  | 'stapleDualTop'
  | 'stapleDualRight'
  | 'stapleDualBottom'
  | 'unknownFutureValue'
  | 'stapleTripleLeft'
  | 'stapleTripleTop'
  | 'stapleTripleRight'
  | 'stapleTripleBottom'
  | 'bindLeft'
  | 'bindTop'
  | 'bindRight'
  | 'bindBottom'
  | 'foldAccordion'
  | 'foldDoubleGate'
  | 'foldGate'
  | 'foldHalf'
  | 'foldHalfZ'
  | 'foldLeftGate'
  | 'foldLetter'
  | 'foldParallel'
  | 'foldPoster'
  | 'foldRightGate'
  | 'foldZ'
  | 'foldEngineeringZ'
  | 'punchTopLeft'
  | 'punchBottomLeft'
  | 'punchTopRight'
  | 'punchBottomRight'
  | 'punchDualLeft'
  | 'punchDualTop'
  | 'punchDualRight'
  | 'punchDualBottom'
  | 'punchTripleLeft'
  | 'punchTripleTop'
  | 'punchTripleRight'
  | 'punchTripleBottom'
  | 'punchQuadLeft'
  | 'punchQuadTop'
  | 'punchQuadRight'
  | 'punchQuadBottom'
  | 'fold'
  | 'trim'
  | 'bale'
  | 'bookletMaker'
  | 'coat'
  | 'laminate'
  | 'trimAfterPages'
  | 'trimAfterDocuments'
  | 'trimAfterCopies'
  | 'trimAfterJob';
type microsoft_graph_printMultipageLayout =
  | 'clockwiseFromTopLeft'
  | 'counterclockwiseFromTopLeft'
  | 'counterclockwiseFromTopRight'
  | 'clockwiseFromTopRight'
  | 'counterclockwiseFromBottomLeft'
  | 'clockwiseFromBottomLeft'
  | 'counterclockwiseFromBottomRight'
  | 'clockwiseFromBottomRight'
  | 'unknownFutureValue';
type microsoft_graph_printOrientation =
  | 'portrait'
  | 'landscape'
  | 'reverseLandscape'
  | 'reversePortrait'
  | 'unknownFutureValue';
type microsoft_graph_printQuality = 'low' | 'medium' | 'high' | 'unknownFutureValue';
type microsoft_graph_printScaling =
  | 'auto'
  | 'shrinkToFit'
  | 'fill'
  | 'fit'
  | 'none'
  | 'unknownFutureValue';
type microsoft_graph_printerDefaults = Partial<{
  colorMode: (microsoft_graph_printColorMode | {}) | Array<microsoft_graph_printColorMode | {}>;
  contentType: string | null;
  copiesPerJob: number | null;
  dpi: number | null;
  duplexMode: (microsoft_graph_printDuplexMode | {}) | Array<microsoft_graph_printDuplexMode | {}>;
  finishings: Array<
    (microsoft_graph_printFinishing | {}) | Array<microsoft_graph_printFinishing | {}>
  >;
  fitPdfToPage: boolean | null;
  inputBin: string | null;
  mediaColor: string | null;
  mediaSize: string | null;
  mediaType: string | null;
  multipageLayout:
    | (microsoft_graph_printMultipageLayout | {})
    | Array<microsoft_graph_printMultipageLayout | {}>;
  orientation:
    | (microsoft_graph_printOrientation | {})
    | Array<microsoft_graph_printOrientation | {}>;
  outputBin: string | null;
  pagesPerSheet: number | null;
  quality: (microsoft_graph_printQuality | {}) | Array<microsoft_graph_printQuality | {}>;
  scaling: (microsoft_graph_printScaling | {}) | Array<microsoft_graph_printScaling | {}>;
}>;
type microsoft_graph_printerLocation = Partial<{
  altitudeInMeters: number | null;
  building: string | null;
  city: string | null;
  countryOrRegion: string | null;
  floor: string | null;
  floorDescription: string | null;
  latitude: (number | null) | (string | null) | ReferenceNumeric;
  longitude: (number | null) | (string | null) | ReferenceNumeric;
  organization: Array<string | null>;
  postalCode: string | null;
  roomDescription: string | null;
  roomName: string | null;
  site: string | null;
  stateOrProvince: string | null;
  streetAddress: string | null;
  subdivision: Array<string | null>;
  subunit: Array<string | null>;
}>;
type microsoft_graph_printerStatus = Partial<{
  description: string | null;
  details: Array<microsoft_graph_printerProcessingStateDetail>;
  state: microsoft_graph_printerProcessingState;
}>;
type microsoft_graph_printerProcessingStateDetail =
  | 'paused'
  | 'mediaJam'
  | 'mediaNeeded'
  | 'mediaLow'
  | 'mediaEmpty'
  | 'coverOpen'
  | 'interlockOpen'
  | 'outputTrayMissing'
  | 'outputAreaFull'
  | 'markerSupplyLow'
  | 'markerSupplyEmpty'
  | 'inputTrayMissing'
  | 'outputAreaAlmostFull'
  | 'markerWasteAlmostFull'
  | 'markerWasteFull'
  | 'fuserOverTemp'
  | 'fuserUnderTemp'
  | 'other'
  | 'none'
  | 'movingToPaused'
  | 'shutdown'
  | 'connectingToDevice'
  | 'timedOut'
  | 'stopping'
  | 'stoppedPartially'
  | 'tonerLow'
  | 'tonerEmpty'
  | 'spoolAreaFull'
  | 'doorOpen'
  | 'opticalPhotoConductorNearEndOfLife'
  | 'opticalPhotoConductorLifeOver'
  | 'developerLow'
  | 'developerEmpty'
  | 'interpreterResourceUnavailable'
  | 'unknownFutureValue'
  | 'alertRemovalOfBinaryChangeEntry'
  | 'banderAdded'
  | 'banderAlmostEmpty'
  | 'banderAlmostFull'
  | 'banderAtLimit'
  | 'banderClosed'
  | 'banderConfigurationChange'
  | 'banderCoverClosed'
  | 'banderCoverOpen'
  | 'banderEmpty'
  | 'banderFull'
  | 'banderInterlockClosed'
  | 'banderInterlockOpen'
  | 'banderJam'
  | 'banderLifeAlmostOver'
  | 'banderLifeOver'
  | 'banderMemoryExhausted'
  | 'banderMissing'
  | 'banderMotorFailure'
  | 'banderNearLimit'
  | 'banderOffline'
  | 'banderOpened'
  | 'banderOverTemperature'
  | 'banderPowerSaver'
  | 'banderRecoverableFailure'
  | 'banderRecoverableStorage'
  | 'banderRemoved'
  | 'banderResourceAdded'
  | 'banderResourceRemoved'
  | 'banderThermistorFailure'
  | 'banderTimingFailure'
  | 'banderTurnedOff'
  | 'banderTurnedOn'
  | 'banderUnderTemperature'
  | 'banderUnrecoverableFailure'
  | 'banderUnrecoverableStorageError'
  | 'banderWarmingUp'
  | 'binderAdded'
  | 'binderAlmostEmpty'
  | 'binderAlmostFull'
  | 'binderAtLimit'
  | 'binderClosed'
  | 'binderConfigurationChange'
  | 'binderCoverClosed'
  | 'binderCoverOpen'
  | 'binderEmpty'
  | 'binderFull'
  | 'binderInterlockClosed'
  | 'binderInterlockOpen'
  | 'binderJam'
  | 'binderLifeAlmostOver'
  | 'binderLifeOver'
  | 'binderMemoryExhausted'
  | 'binderMissing'
  | 'binderMotorFailure'
  | 'binderNearLimit'
  | 'binderOffline'
  | 'binderOpened'
  | 'binderOverTemperature'
  | 'binderPowerSaver'
  | 'binderRecoverableFailure'
  | 'binderRecoverableStorage'
  | 'binderRemoved'
  | 'binderResourceAdded'
  | 'binderResourceRemoved'
  | 'binderThermistorFailure'
  | 'binderTimingFailure'
  | 'binderTurnedOff'
  | 'binderTurnedOn'
  | 'binderUnderTemperature'
  | 'binderUnrecoverableFailure'
  | 'binderUnrecoverableStorageError'
  | 'binderWarmingUp'
  | 'cameraFailure'
  | 'chamberCooling'
  | 'chamberFailure'
  | 'chamberHeating'
  | 'chamberTemperatureHigh'
  | 'chamberTemperatureLow'
  | 'cleanerLifeAlmostOver'
  | 'cleanerLifeOver'
  | 'configurationChange'
  | 'deactivated'
  | 'deleted'
  | 'dieCutterAdded'
  | 'dieCutterAlmostEmpty'
  | 'dieCutterAlmostFull'
  | 'dieCutterAtLimit'
  | 'dieCutterClosed'
  | 'dieCutterConfigurationChange'
  | 'dieCutterCoverClosed'
  | 'dieCutterCoverOpen'
  | 'dieCutterEmpty'
  | 'dieCutterFull'
  | 'dieCutterInterlockClosed'
  | 'dieCutterInterlockOpen'
  | 'dieCutterJam'
  | 'dieCutterLifeAlmostOver'
  | 'dieCutterLifeOver'
  | 'dieCutterMemoryExhausted'
  | 'dieCutterMissing'
  | 'dieCutterMotorFailure'
  | 'dieCutterNearLimit'
  | 'dieCutterOffline'
  | 'dieCutterOpened'
  | 'dieCutterOverTemperature'
  | 'dieCutterPowerSaver'
  | 'dieCutterRecoverableFailure'
  | 'dieCutterRecoverableStorage'
  | 'dieCutterRemoved'
  | 'dieCutterResourceAdded'
  | 'dieCutterResourceRemoved'
  | 'dieCutterThermistorFailure'
  | 'dieCutterTimingFailure'
  | 'dieCutterTurnedOff'
  | 'dieCutterTurnedOn'
  | 'dieCutterUnderTemperature'
  | 'dieCutterUnrecoverableFailure'
  | 'dieCutterUnrecoverableStorageError'
  | 'dieCutterWarmingUp'
  | 'extruderCooling'
  | 'extruderFailure'
  | 'extruderHeating'
  | 'extruderJam'
  | 'extruderTemperatureHigh'
  | 'extruderTemperatureLow'
  | 'fanFailure'
  | 'faxModemLifeAlmostOver'
  | 'faxModemLifeOver'
  | 'faxModemMissing'
  | 'faxModemTurnedOff'
  | 'faxModemTurnedOn'
  | 'folderAdded'
  | 'folderAlmostEmpty'
  | 'folderAlmostFull'
  | 'folderAtLimit'
  | 'folderClosed'
  | 'folderConfigurationChange'
  | 'folderCoverClosed'
  | 'folderCoverOpen'
  | 'folderEmpty'
  | 'folderFull'
  | 'folderInterlockClosed'
  | 'folderInterlockOpen'
  | 'folderJam'
  | 'folderLifeAlmostOver'
  | 'folderLifeOver'
  | 'folderMemoryExhausted'
  | 'folderMissing'
  | 'folderMotorFailure'
  | 'folderNearLimit'
  | 'folderOffline'
  | 'folderOpened'
  | 'folderOverTemperature'
  | 'folderPowerSaver'
  | 'folderRecoverableFailure'
  | 'folderRecoverableStorage'
  | 'folderRemoved'
  | 'folderResourceAdded'
  | 'folderResourceRemoved'
  | 'folderThermistorFailure'
  | 'folderTimingFailure'
  | 'folderTurnedOff'
  | 'folderTurnedOn'
  | 'folderUnderTemperature'
  | 'folderUnrecoverableFailure'
  | 'folderUnrecoverableStorageError'
  | 'folderWarmingUp'
  | 'hibernate'
  | 'holdNewJobs'
  | 'identifyPrinterRequested'
  | 'imprinterAdded'
  | 'imprinterAlmostEmpty'
  | 'imprinterAlmostFull'
  | 'imprinterAtLimit'
  | 'imprinterClosed'
  | 'imprinterConfigurationChange'
  | 'imprinterCoverClosed'
  | 'imprinterCoverOpen'
  | 'imprinterEmpty'
  | 'imprinterFull'
  | 'imprinterInterlockClosed'
  | 'imprinterInterlockOpen'
  | 'imprinterJam'
  | 'imprinterLifeAlmostOver'
  | 'imprinterLifeOver'
  | 'imprinterMemoryExhausted'
  | 'imprinterMissing'
  | 'imprinterMotorFailure'
  | 'imprinterNearLimit'
  | 'imprinterOffline'
  | 'imprinterOpened'
  | 'imprinterOverTemperature'
  | 'imprinterPowerSaver'
  | 'imprinterRecoverableFailure'
  | 'imprinterRecoverableStorage'
  | 'imprinterRemoved'
  | 'imprinterResourceAdded'
  | 'imprinterResourceRemoved'
  | 'imprinterThermistorFailure'
  | 'imprinterTimingFailure'
  | 'imprinterTurnedOff'
  | 'imprinterTurnedOn'
  | 'imprinterUnderTemperature'
  | 'imprinterUnrecoverableFailure'
  | 'imprinterUnrecoverableStorageError'
  | 'imprinterWarmingUp'
  | 'inputCannotFeedSizeSelected'
  | 'inputManualInputRequest'
  | 'inputMediaColorChange'
  | 'inputMediaFormPartsChange'
  | 'inputMediaSizeChange'
  | 'inputMediaTrayFailure'
  | 'inputMediaTrayFeedError'
  | 'inputMediaTrayJam'
  | 'inputMediaTypeChange'
  | 'inputMediaWeightChange'
  | 'inputPickRollerFailure'
  | 'inputPickRollerLifeOver'
  | 'inputPickRollerLifeWarn'
  | 'inputPickRollerMissing'
  | 'inputTrayElevationFailure'
  | 'inputTrayPositionFailure'
  | 'inserterAdded'
  | 'inserterAlmostEmpty'
  | 'inserterAlmostFull'
  | 'inserterAtLimit'
  | 'inserterClosed'
  | 'inserterConfigurationChange'
  | 'inserterCoverClosed'
  | 'inserterCoverOpen'
  | 'inserterEmpty'
  | 'inserterFull'
  | 'inserterInterlockClosed'
  | 'inserterInterlockOpen'
  | 'inserterJam'
  | 'inserterLifeAlmostOver'
  | 'inserterLifeOver'
  | 'inserterMemoryExhausted'
  | 'inserterMissing'
  | 'inserterMotorFailure'
  | 'inserterNearLimit'
  | 'inserterOffline'
  | 'inserterOpened'
  | 'inserterOverTemperature'
  | 'inserterPowerSaver'
  | 'inserterRecoverableFailure'
  | 'inserterRecoverableStorage'
  | 'inserterRemoved'
  | 'inserterResourceAdded'
  | 'inserterResourceRemoved'
  | 'inserterThermistorFailure'
  | 'inserterTimingFailure'
  | 'inserterTurnedOff'
  | 'inserterTurnedOn'
  | 'inserterUnderTemperature'
  | 'inserterUnrecoverableFailure'
  | 'inserterUnrecoverableStorageError'
  | 'inserterWarmingUp'
  | 'interlockClosed'
  | 'interpreterCartridgeAdded'
  | 'interpreterCartridgeDeleted'
  | 'interpreterComplexPageEncountered'
  | 'interpreterMemoryDecrease'
  | 'interpreterMemoryIncrease'
  | 'interpreterResourceAdded'
  | 'interpreterResourceDeleted'
  | 'lampAtEol'
  | 'lampFailure'
  | 'lampNearEol'
  | 'laserAtEol'
  | 'laserFailure'
  | 'laserNearEol'
  | 'makeEnvelopeAdded'
  | 'makeEnvelopeAlmostEmpty'
  | 'makeEnvelopeAlmostFull'
  | 'makeEnvelopeAtLimit'
  | 'makeEnvelopeClosed'
  | 'makeEnvelopeConfigurationChange'
  | 'makeEnvelopeCoverClosed'
  | 'makeEnvelopeCoverOpen'
  | 'makeEnvelopeEmpty'
  | 'makeEnvelopeFull'
  | 'makeEnvelopeInterlockClosed'
  | 'makeEnvelopeInterlockOpen'
  | 'makeEnvelopeJam'
  | 'makeEnvelopeLifeAlmostOver'
  | 'makeEnvelopeLifeOver'
  | 'makeEnvelopeMemoryExhausted'
  | 'makeEnvelopeMissing'
  | 'makeEnvelopeMotorFailure'
  | 'makeEnvelopeNearLimit'
  | 'makeEnvelopeOffline'
  | 'makeEnvelopeOpened'
  | 'makeEnvelopeOverTemperature'
  | 'makeEnvelopePowerSaver'
  | 'makeEnvelopeRecoverableFailure'
  | 'makeEnvelopeRecoverableStorage'
  | 'makeEnvelopeRemoved'
  | 'makeEnvelopeResourceAdded'
  | 'makeEnvelopeResourceRemoved'
  | 'makeEnvelopeThermistorFailure'
  | 'makeEnvelopeTimingFailure'
  | 'makeEnvelopeTurnedOff'
  | 'makeEnvelopeTurnedOn'
  | 'makeEnvelopeUnderTemperature'
  | 'makeEnvelopeUnrecoverableFailure'
  | 'makeEnvelopeUnrecoverableStorageError'
  | 'makeEnvelopeWarmingUp'
  | 'markerAdjustingPrintQuality'
  | 'markerCleanerMissing'
  | 'markerDeveloperAlmostEmpty'
  | 'markerDeveloperEmpty'
  | 'markerDeveloperMissing'
  | 'markerFuserMissing'
  | 'markerFuserThermistorFailure'
  | 'markerFuserTimingFailure'
  | 'markerInkAlmostEmpty'
  | 'markerInkEmpty'
  | 'markerInkMissing'
  | 'markerOpcMissing'
  | 'markerPrintRibbonAlmostEmpty'
  | 'markerPrintRibbonEmpty'
  | 'markerPrintRibbonMissing'
  | 'markerSupplyAlmostEmpty'
  | 'markerSupplyMissing'
  | 'markerTonerCartridgeMissing'
  | 'markerTonerMissing'
  | 'markerWasteInkReceptacleAlmostFull'
  | 'markerWasteInkReceptacleFull'
  | 'markerWasteInkReceptacleMissing'
  | 'markerWasteMissing'
  | 'markerWasteTonerReceptacleAlmostFull'
  | 'markerWasteTonerReceptacleFull'
  | 'markerWasteTonerReceptacleMissing'
  | 'materialEmpty'
  | 'materialLow'
  | 'materialNeeded'
  | 'mediaDrying'
  | 'mediaPathCannotDuplexMediaSelected'
  | 'mediaPathFailure'
  | 'mediaPathInputEmpty'
  | 'mediaPathInputFeedError'
  | 'mediaPathInputJam'
  | 'mediaPathInputRequest'
  | 'mediaPathJam'
  | 'mediaPathMediaTrayAlmostFull'
  | 'mediaPathMediaTrayFull'
  | 'mediaPathMediaTrayMissing'
  | 'mediaPathOutputFeedError'
  | 'mediaPathOutputFull'
  | 'mediaPathOutputJam'
  | 'mediaPathPickRollerFailure'
  | 'mediaPathPickRollerLifeOver'
  | 'mediaPathPickRollerLifeWarn'
  | 'mediaPathPickRollerMissing'
  | 'motorFailure'
  | 'outputMailboxSelectFailure'
  | 'outputMediaTrayFailure'
  | 'outputMediaTrayFeedError'
  | 'outputMediaTrayJam'
  | 'perforaterAdded'
  | 'perforaterAlmostEmpty'
  | 'perforaterAlmostFull'
  | 'perforaterAtLimit'
  | 'perforaterClosed'
  | 'perforaterConfigurationChange'
  | 'perforaterCoverClosed'
  | 'perforaterCoverOpen'
  | 'perforaterEmpty'
  | 'perforaterFull'
  | 'perforaterInterlockClosed'
  | 'perforaterInterlockOpen'
  | 'perforaterJam'
  | 'perforaterLifeAlmostOver'
  | 'perforaterLifeOver'
  | 'perforaterMemoryExhausted'
  | 'perforaterMissing'
  | 'perforaterMotorFailure'
  | 'perforaterNearLimit'
  | 'perforaterOffline'
  | 'perforaterOpened'
  | 'perforaterOverTemperature'
  | 'perforaterPowerSaver'
  | 'perforaterRecoverableFailure'
  | 'perforaterRecoverableStorage'
  | 'perforaterRemoved'
  | 'perforaterResourceAdded'
  | 'perforaterResourceRemoved'
  | 'perforaterThermistorFailure'
  | 'perforaterTimingFailure'
  | 'perforaterTurnedOff'
  | 'perforaterTurnedOn'
  | 'perforaterUnderTemperature'
  | 'perforaterUnrecoverableFailure'
  | 'perforaterUnrecoverableStorageError'
  | 'perforaterWarmingUp'
  | 'platformCooling'
  | 'platformFailure'
  | 'platformHeating'
  | 'platformTemperatureHigh'
  | 'platformTemperatureLow'
  | 'powerDown'
  | 'powerUp'
  | 'printerManualReset'
  | 'printerNmsReset'
  | 'printerReadyToPrint'
  | 'puncherAdded'
  | 'puncherAlmostEmpty'
  | 'puncherAlmostFull'
  | 'puncherAtLimit'
  | 'puncherClosed'
  | 'puncherConfigurationChange'
  | 'puncherCoverClosed'
  | 'puncherCoverOpen'
  | 'puncherEmpty'
  | 'puncherFull'
  | 'puncherInterlockClosed'
  | 'puncherInterlockOpen'
  | 'puncherJam'
  | 'puncherLifeAlmostOver'
  | 'puncherLifeOver'
  | 'puncherMemoryExhausted'
  | 'puncherMissing'
  | 'puncherMotorFailure'
  | 'puncherNearLimit'
  | 'puncherOffline'
  | 'puncherOpened'
  | 'puncherOverTemperature'
  | 'puncherPowerSaver'
  | 'puncherRecoverableFailure'
  | 'puncherRecoverableStorage'
  | 'puncherRemoved'
  | 'puncherResourceAdded'
  | 'puncherResourceRemoved'
  | 'puncherThermistorFailure'
  | 'puncherTimingFailure'
  | 'puncherTurnedOff'
  | 'puncherTurnedOn'
  | 'puncherUnderTemperature'
  | 'puncherUnrecoverableFailure'
  | 'puncherUnrecoverableStorageError'
  | 'puncherWarmingUp'
  | 'resuming'
  | 'scanMediaPathFailure'
  | 'scanMediaPathInputEmpty'
  | 'scanMediaPathInputFeedError'
  | 'scanMediaPathInputJam'
  | 'scanMediaPathInputRequest'
  | 'scanMediaPathJam'
  | 'scanMediaPathOutputFeedError'
  | 'scanMediaPathOutputFull'
  | 'scanMediaPathOutputJam'
  | 'scanMediaPathPickRollerFailure'
  | 'scanMediaPathPickRollerLifeOver'
  | 'scanMediaPathPickRollerLifeWarn'
  | 'scanMediaPathPickRollerMissing'
  | 'scanMediaPathTrayAlmostFull'
  | 'scanMediaPathTrayFull'
  | 'scanMediaPathTrayMissing'
  | 'scannerLightFailure'
  | 'scannerLightLifeAlmostOver'
  | 'scannerLightLifeOver'
  | 'scannerLightMissing'
  | 'scannerSensorFailure'
  | 'scannerSensorLifeAlmostOver'
  | 'scannerSensorLifeOver'
  | 'scannerSensorMissing'
  | 'separationCutterAdded'
  | 'separationCutterAlmostEmpty'
  | 'separationCutterAlmostFull'
  | 'separationCutterAtLimit'
  | 'separationCutterClosed'
  | 'separationCutterConfigurationChange'
  | 'separationCutterCoverClosed'
  | 'separationCutterCoverOpen'
  | 'separationCutterEmpty'
  | 'separationCutterFull'
  | 'separationCutterInterlockClosed'
  | 'separationCutterInterlockOpen'
  | 'separationCutterJam'
  | 'separationCutterLifeAlmostOver'
  | 'separationCutterLifeOver'
  | 'separationCutterMemoryExhausted'
  | 'separationCutterMissing'
  | 'separationCutterMotorFailure'
  | 'separationCutterNearLimit'
  | 'separationCutterOffline'
  | 'separationCutterOpened'
  | 'separationCutterOverTemperature'
  | 'separationCutterPowerSaver'
  | 'separationCutterRecoverableFailure'
  | 'separationCutterRecoverableStorage'
  | 'separationCutterRemoved'
  | 'separationCutterResourceAdded'
  | 'separationCutterResourceRemoved'
  | 'separationCutterThermistorFailure'
  | 'separationCutterTimingFailure'
  | 'separationCutterTurnedOff'
  | 'separationCutterTurnedOn'
  | 'separationCutterUnderTemperature'
  | 'separationCutterUnrecoverableFailure'
  | 'separationCutterUnrecoverableStorageError'
  | 'separationCutterWarmingUp'
  | 'sheetRotatorAdded'
  | 'sheetRotatorAlmostEmpty'
  | 'sheetRotatorAlmostFull'
  | 'sheetRotatorAtLimit'
  | 'sheetRotatorClosed'
  | 'sheetRotatorConfigurationChange'
  | 'sheetRotatorCoverClosed'
  | 'sheetRotatorCoverOpen'
  | 'sheetRotatorEmpty'
  | 'sheetRotatorFull'
  | 'sheetRotatorInterlockClosed'
  | 'sheetRotatorInterlockOpen'
  | 'sheetRotatorJam'
  | 'sheetRotatorLifeAlmostOver'
  | 'sheetRotatorLifeOver'
  | 'sheetRotatorMemoryExhausted'
  | 'sheetRotatorMissing'
  | 'sheetRotatorMotorFailure'
  | 'sheetRotatorNearLimit'
  | 'sheetRotatorOffline'
  | 'sheetRotatorOpened'
  | 'sheetRotatorOverTemperature'
  | 'sheetRotatorPowerSaver'
  | 'sheetRotatorRecoverableFailure'
  | 'sheetRotatorRecoverableStorage'
  | 'sheetRotatorRemoved'
  | 'sheetRotatorResourceAdded'
  | 'sheetRotatorResourceRemoved'
  | 'sheetRotatorThermistorFailure'
  | 'sheetRotatorTimingFailure'
  | 'sheetRotatorTurnedOff'
  | 'sheetRotatorTurnedOn'
  | 'sheetRotatorUnderTemperature'
  | 'sheetRotatorUnrecoverableFailure'
  | 'sheetRotatorUnrecoverableStorageError'
  | 'sheetRotatorWarmingUp'
  | 'slitterAdded'
  | 'slitterAlmostEmpty'
  | 'slitterAlmostFull'
  | 'slitterAtLimit'
  | 'slitterClosed'
  | 'slitterConfigurationChange'
  | 'slitterCoverClosed'
  | 'slitterCoverOpen'
  | 'slitterEmpty'
  | 'slitterFull'
  | 'slitterInterlockClosed'
  | 'slitterInterlockOpen'
  | 'slitterJam'
  | 'slitterLifeAlmostOver'
  | 'slitterLifeOver'
  | 'slitterMemoryExhausted'
  | 'slitterMissing'
  | 'slitterMotorFailure'
  | 'slitterNearLimit'
  | 'slitterOffline'
  | 'slitterOpened'
  | 'slitterOverTemperature'
  | 'slitterPowerSaver'
  | 'slitterRecoverableFailure'
  | 'slitterRecoverableStorage'
  | 'slitterRemoved'
  | 'slitterResourceAdded'
  | 'slitterResourceRemoved'
  | 'slitterThermistorFailure'
  | 'slitterTimingFailure'
  | 'slitterTurnedOff'
  | 'slitterTurnedOn'
  | 'slitterUnderTemperature'
  | 'slitterUnrecoverableFailure'
  | 'slitterUnrecoverableStorageError'
  | 'slitterWarmingUp'
  | 'stackerAdded'
  | 'stackerAlmostEmpty'
  | 'stackerAlmostFull'
  | 'stackerAtLimit'
  | 'stackerClosed'
  | 'stackerConfigurationChange'
  | 'stackerCoverClosed'
  | 'stackerCoverOpen'
  | 'stackerEmpty'
  | 'stackerFull'
  | 'stackerInterlockClosed'
  | 'stackerInterlockOpen'
  | 'stackerJam'
  | 'stackerLifeAlmostOver'
  | 'stackerLifeOver'
  | 'stackerMemoryExhausted'
  | 'stackerMissing'
  | 'stackerMotorFailure'
  | 'stackerNearLimit'
  | 'stackerOffline'
  | 'stackerOpened'
  | 'stackerOverTemperature'
  | 'stackerPowerSaver'
  | 'stackerRecoverableFailure'
  | 'stackerRecoverableStorage'
  | 'stackerRemoved'
  | 'stackerResourceAdded'
  | 'stackerResourceRemoved'
  | 'stackerThermistorFailure'
  | 'stackerTimingFailure'
  | 'stackerTurnedOff'
  | 'stackerTurnedOn'
  | 'stackerUnderTemperature'
  | 'stackerUnrecoverableFailure'
  | 'stackerUnrecoverableStorageError'
  | 'stackerWarmingUp'
  | 'standby'
  | 'staplerAdded'
  | 'staplerAlmostEmpty'
  | 'staplerAlmostFull'
  | 'staplerAtLimit'
  | 'staplerClosed'
  | 'staplerConfigurationChange'
  | 'staplerCoverClosed'
  | 'staplerCoverOpen'
  | 'staplerEmpty'
  | 'staplerFull'
  | 'staplerInterlockClosed'
  | 'staplerInterlockOpen'
  | 'staplerJam'
  | 'staplerLifeAlmostOver'
  | 'staplerLifeOver'
  | 'staplerMemoryExhausted'
  | 'staplerMissing'
  | 'staplerMotorFailure'
  | 'staplerNearLimit'
  | 'staplerOffline'
  | 'staplerOpened'
  | 'staplerOverTemperature'
  | 'staplerPowerSaver'
  | 'staplerRecoverableFailure'
  | 'staplerRecoverableStorage'
  | 'staplerRemoved'
  | 'staplerResourceAdded'
  | 'staplerResourceRemoved'
  | 'staplerThermistorFailure'
  | 'staplerTimingFailure'
  | 'staplerTurnedOff'
  | 'staplerTurnedOn'
  | 'staplerUnderTemperature'
  | 'staplerUnrecoverableFailure'
  | 'staplerUnrecoverableStorageError'
  | 'staplerWarmingUp'
  | 'stitcherAdded'
  | 'stitcherAlmostEmpty'
  | 'stitcherAlmostFull'
  | 'stitcherAtLimit'
  | 'stitcherClosed'
  | 'stitcherConfigurationChange'
  | 'stitcherCoverClosed'
  | 'stitcherCoverOpen'
  | 'stitcherEmpty'
  | 'stitcherFull'
  | 'stitcherInterlockClosed'
  | 'stitcherInterlockOpen'
  | 'stitcherJam'
  | 'stitcherLifeAlmostOver'
  | 'stitcherLifeOver'
  | 'stitcherMemoryExhausted'
  | 'stitcherMissing'
  | 'stitcherMotorFailure'
  | 'stitcherNearLimit'
  | 'stitcherOffline'
  | 'stitcherOpened'
  | 'stitcherOverTemperature'
  | 'stitcherPowerSaver'
  | 'stitcherRecoverableFailure'
  | 'stitcherRecoverableStorage'
  | 'stitcherRemoved'
  | 'stitcherResourceAdded'
  | 'stitcherResourceRemoved'
  | 'stitcherThermistorFailure'
  | 'stitcherTimingFailure'
  | 'stitcherTurnedOff'
  | 'stitcherTurnedOn'
  | 'stitcherUnderTemperature'
  | 'stitcherUnrecoverableFailure'
  | 'stitcherUnrecoverableStorageError'
  | 'stitcherWarmingUp'
  | 'subunitAdded'
  | 'subunitAlmostEmpty'
  | 'subunitAlmostFull'
  | 'subunitAtLimit'
  | 'subunitClosed'
  | 'subunitCoolingDown'
  | 'subunitEmpty'
  | 'subunitFull'
  | 'subunitLifeAlmostOver'
  | 'subunitLifeOver'
  | 'subunitMemoryExhausted'
  | 'subunitMissing'
  | 'subunitMotorFailure'
  | 'subunitNearLimit'
  | 'subunitOffline'
  | 'subunitOpened'
  | 'subunitOverTemperature'
  | 'subunitPowerSaver'
  | 'subunitRecoverableFailure'
  | 'subunitRecoverableStorage'
  | 'subunitRemoved'
  | 'subunitResourceAdded'
  | 'subunitResourceRemoved'
  | 'subunitThermistorFailure'
  | 'subunitTimingFailure'
  | 'subunitTurnedOff'
  | 'subunitTurnedOn'
  | 'subunitUnderTemperature'
  | 'subunitUnrecoverableFailure'
  | 'subunitUnrecoverableStorage'
  | 'subunitWarmingUp'
  | 'suspend'
  | 'testing'
  | 'trimmerAdded'
  | 'trimmerAlmostEmpty'
  | 'trimmerAlmostFull'
  | 'trimmerAtLimit'
  | 'trimmerClosed'
  | 'trimmerConfigurationChange'
  | 'trimmerCoverClosed'
  | 'trimmerCoverOpen'
  | 'trimmerEmpty'
  | 'trimmerFull'
  | 'trimmerInterlockClosed'
  | 'trimmerInterlockOpen'
  | 'trimmerJam'
  | 'trimmerLifeAlmostOver'
  | 'trimmerLifeOver'
  | 'trimmerMemoryExhausted'
  | 'trimmerMissing'
  | 'trimmerMotorFailure'
  | 'trimmerNearLimit'
  | 'trimmerOffline'
  | 'trimmerOpened'
  | 'trimmerOverTemperature'
  | 'trimmerPowerSaver'
  | 'trimmerRecoverableFailure'
  | 'trimmerRecoverableStorage'
  | 'trimmerRemoved'
  | 'trimmerResourceAdded'
  | 'trimmerResourceRemoved'
  | 'trimmerThermistorFailure'
  | 'trimmerTimingFailure'
  | 'trimmerTurnedOff'
  | 'trimmerTurnedOn'
  | 'trimmerUnderTemperature'
  | 'trimmerUnrecoverableFailure'
  | 'trimmerUnrecoverableStorageError'
  | 'trimmerWarmingUp'
  | 'unknown'
  | 'wrapperAdded'
  | 'wrapperAlmostEmpty'
  | 'wrapperAlmostFull'
  | 'wrapperAtLimit'
  | 'wrapperClosed'
  | 'wrapperConfigurationChange'
  | 'wrapperCoverClosed'
  | 'wrapperCoverOpen'
  | 'wrapperEmpty'
  | 'wrapperFull'
  | 'wrapperInterlockClosed'
  | 'wrapperInterlockOpen'
  | 'wrapperJam'
  | 'wrapperLifeAlmostOver'
  | 'wrapperLifeOver'
  | 'wrapperMemoryExhausted'
  | 'wrapperMissing'
  | 'wrapperMotorFailure'
  | 'wrapperNearLimit'
  | 'wrapperOffline'
  | 'wrapperOpened'
  | 'wrapperOverTemperature'
  | 'wrapperPowerSaver'
  | 'wrapperRecoverableFailure'
  | 'wrapperRecoverableStorage'
  | 'wrapperRemoved'
  | 'wrapperResourceAdded'
  | 'wrapperResourceRemoved'
  | 'wrapperThermistorFailure'
  | 'wrapperTimingFailure'
  | 'wrapperTurnedOff'
  | 'wrapperTurnedOn'
  | 'wrapperUnderTemperature'
  | 'wrapperUnrecoverableFailure'
  | 'wrapperUnrecoverableStorageError'
  | 'wrapperWarmingUp';
type microsoft_graph_printerProcessingState =
  | 'unknown'
  | 'idle'
  | 'processing'
  | 'stopped'
  | 'unknownFutureValue';
type microsoft_graph_printJob = microsoft_graph_entity &
  Partial<{
    acknowledgedDateTime: string | null;
    configuration: microsoft_graph_printJobConfiguration;
    createdBy: (microsoft_graph_userIdentity | {}) | Array<microsoft_graph_userIdentity | {}>;
    createdDateTime: string;
    errorCode: number | null;
    isFetchable: boolean;
    redirectedFrom: string | null;
    redirectedTo: string | null;
    status: microsoft_graph_printJobStatus;
    documents: Array<microsoft_graph_printDocument>;
    tasks: Array<microsoft_graph_printTask>;
  }>;
type microsoft_graph_printJobConfiguration = Partial<{
  collate: boolean | null;
  colorMode: (microsoft_graph_printColorMode | {}) | Array<microsoft_graph_printColorMode | {}>;
  copies: number | null;
  dpi: number | null;
  duplexMode: (microsoft_graph_printDuplexMode | {}) | Array<microsoft_graph_printDuplexMode | {}>;
  feedOrientation:
    | (microsoft_graph_printerFeedOrientation | {})
    | Array<microsoft_graph_printerFeedOrientation | {}>;
  finishings: Array<
    (microsoft_graph_printFinishing | {}) | Array<microsoft_graph_printFinishing | {}>
  >;
  fitPdfToPage: boolean | null;
  inputBin: string | null;
  margin: (microsoft_graph_printMargin | {}) | Array<microsoft_graph_printMargin | {}>;
  mediaSize: string | null;
  mediaType: string | null;
  multipageLayout:
    | (microsoft_graph_printMultipageLayout | {})
    | Array<microsoft_graph_printMultipageLayout | {}>;
  orientation:
    | (microsoft_graph_printOrientation | {})
    | Array<microsoft_graph_printOrientation | {}>;
  outputBin: string | null;
  pageRanges: Array<microsoft_graph_integerRange>;
  pagesPerSheet: number | null;
  quality: (microsoft_graph_printQuality | {}) | Array<microsoft_graph_printQuality | {}>;
  scaling: (microsoft_graph_printScaling | {}) | Array<microsoft_graph_printScaling | {}>;
}>;
type microsoft_graph_printMargin = Partial<{
  bottom: number | null;
  left: number | null;
  right: number | null;
  top: number | null;
}>;
type microsoft_graph_userIdentity = microsoft_graph_identity &
  Partial<{
    ipAddress: string | null;
    userPrincipalName: string | null;
  }>;
type microsoft_graph_printJobStatus = Partial<{
  description: string;
  details: Array<microsoft_graph_printJobStateDetail>;
  isAcquiredByPrinter: boolean;
  state: microsoft_graph_printJobProcessingState;
}>;
type microsoft_graph_printJobStateDetail =
  | 'uploadPending'
  | 'transforming'
  | 'completedSuccessfully'
  | 'completedWithWarnings'
  | 'completedWithErrors'
  | 'releaseWait'
  | 'interpreting'
  | 'unknownFutureValue';
type microsoft_graph_printJobProcessingState =
  | 'unknown'
  | 'pending'
  | 'processing'
  | 'paused'
  | 'stopped'
  | 'completed'
  | 'canceled'
  | 'aborted'
  | 'unknownFutureValue';
type microsoft_graph_printDocument = microsoft_graph_entity &
  Partial<{
    contentType: string | null;
    displayName: string | null;
    downloadedDateTime: string | null;
    size: number;
    uploadedDateTime: string | null;
  }>;
type microsoft_graph_printTaskStatus = Partial<{
  description: string;
  state: microsoft_graph_printTaskProcessingState;
}>;
type microsoft_graph_printTaskProcessingState =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'aborted'
  | 'unknownFutureValue';
type microsoft_graph_appIdentity = Partial<{
  appId: string | null;
  displayName: string | null;
  servicePrincipalId: string | null;
  servicePrincipalName: string | null;
}>;
type microsoft_graph_printEvent = 'jobStarted' | 'unknownFutureValue';
type microsoft_graph_printerShareViewpoint = Partial<{
  lastUsedDateTime: string | null;
}>;
type microsoft_graph_groupLifecyclePolicy = microsoft_graph_entity &
  Partial<{
    alternateNotificationEmails: string | null;
    groupLifetimeInDays: number | null;
    managedGroupTypes: string | null;
  }>;
type microsoft_graph_onenote = microsoft_graph_entity &
  Partial<{
    notebooks: Array<microsoft_graph_notebook>;
    operations: Array<microsoft_graph_onenoteOperation>;
    pages: Array<microsoft_graph_onenotePage>;
    resources: Array<microsoft_graph_onenoteResource>;
    sectionGroups: Array<microsoft_graph_sectionGroup>;
    sections: Array<microsoft_graph_onenoteSection>;
  }>;
type microsoft_graph_onenoteEntityHierarchyModel = microsoft_graph_onenoteEntitySchemaObjectModel &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    displayName: string | null;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
  }>;
type microsoft_graph_onenoteEntitySchemaObjectModel = microsoft_graph_onenoteEntityBaseModel &
  Partial<{
    createdDateTime: string | null;
  }>;
type microsoft_graph_onenoteEntityBaseModel = microsoft_graph_entity &
  Partial<{
    self: string | null;
  }>;
type microsoft_graph_notebookLinks = Partial<{
  oneNoteClientUrl: (microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>;
  oneNoteWebUrl: (microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>;
}>;
type microsoft_graph_externalLink = Partial<{
  href: string | null;
}>;
type microsoft_graph_onenoteUserRole = 'None' | 'Owner' | 'Contributor' | 'Reader';
type microsoft_graph_sectionLinks = Partial<{
  oneNoteClientUrl: (microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>;
  oneNoteWebUrl: (microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>;
}>;
type microsoft_graph_pageLinks = Partial<{
  oneNoteClientUrl: (microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>;
  oneNoteWebUrl: (microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>;
}>;
type microsoft_graph_onenoteOperation = microsoft_graph_operation &
  Partial<{
    error:
      | (microsoft_graph_onenoteOperationError | {})
      | Array<microsoft_graph_onenoteOperationError | {}>;
    percentComplete: string | null;
    resourceId: string | null;
    resourceLocation: string | null;
  }>;
type microsoft_graph_operation = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    lastActionDateTime: string | null;
    status: (microsoft_graph_operationStatus | {}) | Array<microsoft_graph_operationStatus | {}>;
  }>;
type microsoft_graph_operationStatus = 'NotStarted' | 'Running' | 'Completed' | 'Failed';
type microsoft_graph_onenoteOperationError = Partial<{
  code: string | null;
  message: string | null;
}>;
type microsoft_graph_onenoteResource = microsoft_graph_onenoteEntityBaseModel &
  Partial<{
    content: string | null;
    contentUrl: string | null;
  }>;
type microsoft_graph_resourceSpecificPermissionGrant = microsoft_graph_directoryObject &
  Partial<{
    clientAppId: string | null;
    clientId: string | null;
    permission: string | null;
    permissionType: string | null;
    resourceAppId: string | null;
  }>;
type microsoft_graph_profilePhoto = microsoft_graph_entity &
  Partial<{
    height: number | null;
    width: number | null;
  }>;
type microsoft_graph_plannerGroup = microsoft_graph_entity &
  Partial<{
    plans: Array<microsoft_graph_plannerPlan>;
  }>;
type microsoft_graph_plannerPlan = microsoft_graph_entity &
  Partial<{
    container:
      | (microsoft_graph_plannerPlanContainer | {})
      | Array<microsoft_graph_plannerPlanContainer | {}>;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    owner: string | null;
    title: string;
    buckets: Array<microsoft_graph_plannerBucket>;
    details:
      | (microsoft_graph_plannerPlanDetails | {})
      | Array<microsoft_graph_plannerPlanDetails | {}>;
    tasks: Array<microsoft_graph_plannerTask>;
  }>;
type microsoft_graph_plannerPlanContainer = Partial<{
  containerId: string | null;
  type:
    | (microsoft_graph_plannerContainerType | {})
    | Array<microsoft_graph_plannerContainerType | {}>;
  url: string | null;
}>;
type microsoft_graph_plannerContainerType = 'group' | 'unknownFutureValue' | 'roster';
type microsoft_graph_plannerBucket = microsoft_graph_entity &
  Partial<{
    name: string;
    orderHint: string | null;
    planId: string | null;
    tasks: Array<microsoft_graph_plannerTask>;
  }>;
type microsoft_graph_plannerTask = microsoft_graph_entity &
  Partial<{
    activeChecklistItemCount: number | null;
    appliedCategories:
      | (microsoft_graph_plannerAppliedCategories | {})
      | Array<microsoft_graph_plannerAppliedCategories | {}>;
    assigneePriority: string | null;
    assignments:
      | (microsoft_graph_plannerAssignments | {})
      | Array<microsoft_graph_plannerAssignments | {}>;
    bucketId: string | null;
    checklistItemCount: number | null;
    completedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    completedDateTime: string | null;
    conversationThreadId: string | null;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    dueDateTime: string | null;
    hasDescription: boolean | null;
    orderHint: string | null;
    percentComplete: number | null;
    planId: string | null;
    previewType:
      | (microsoft_graph_plannerPreviewType | {})
      | Array<microsoft_graph_plannerPreviewType | {}>;
    priority: number | null;
    referenceCount: number | null;
    startDateTime: string | null;
    title: string;
    assignedToTaskBoardFormat:
      | (microsoft_graph_plannerAssignedToTaskBoardTaskFormat | {})
      | Array<microsoft_graph_plannerAssignedToTaskBoardTaskFormat | {}>;
    bucketTaskBoardFormat:
      | (microsoft_graph_plannerBucketTaskBoardTaskFormat | {})
      | Array<microsoft_graph_plannerBucketTaskBoardTaskFormat | {}>;
    details:
      | (microsoft_graph_plannerTaskDetails | {})
      | Array<microsoft_graph_plannerTaskDetails | {}>;
    progressTaskBoardFormat:
      | (microsoft_graph_plannerProgressTaskBoardTaskFormat | {})
      | Array<microsoft_graph_plannerProgressTaskBoardTaskFormat | {}>;
  }>;
type microsoft_graph_plannerAppliedCategories = Partial<{}>;
type microsoft_graph_plannerAssignments = Partial<{}>;
type microsoft_graph_plannerPreviewType =
  | 'automatic'
  | 'noPreview'
  | 'checklist'
  | 'description'
  | 'reference';
type microsoft_graph_plannerAssignedToTaskBoardTaskFormat = microsoft_graph_entity &
  Partial<{
    orderHintsByAssignee:
      | (microsoft_graph_plannerOrderHintsByAssignee | {})
      | Array<microsoft_graph_plannerOrderHintsByAssignee | {}>;
    unassignedOrderHint: string | null;
  }>;
type microsoft_graph_plannerOrderHintsByAssignee = Partial<{}>;
type microsoft_graph_plannerBucketTaskBoardTaskFormat = microsoft_graph_entity &
  Partial<{
    orderHint: string | null;
  }>;
type microsoft_graph_plannerTaskDetails = microsoft_graph_entity &
  Partial<{
    checklist:
      | (microsoft_graph_plannerChecklistItems | {})
      | Array<microsoft_graph_plannerChecklistItems | {}>;
    description: string | null;
    previewType:
      | (microsoft_graph_plannerPreviewType | {})
      | Array<microsoft_graph_plannerPreviewType | {}>;
    references:
      | (microsoft_graph_plannerExternalReferences | {})
      | Array<microsoft_graph_plannerExternalReferences | {}>;
  }>;
type microsoft_graph_plannerChecklistItems = Partial<{}>;
type microsoft_graph_plannerExternalReferences = Partial<{}>;
type microsoft_graph_plannerProgressTaskBoardTaskFormat = microsoft_graph_entity &
  Partial<{
    orderHint: string | null;
  }>;
type microsoft_graph_plannerPlanDetails = microsoft_graph_entity &
  Partial<{
    categoryDescriptions:
      | (microsoft_graph_plannerCategoryDescriptions | {})
      | Array<microsoft_graph_plannerCategoryDescriptions | {}>;
    sharedWith: (microsoft_graph_plannerUserIds | {}) | Array<microsoft_graph_plannerUserIds | {}>;
  }>;
type microsoft_graph_plannerCategoryDescriptions = Partial<{
  category1: string | null;
  category10: string | null;
  category11: string | null;
  category12: string | null;
  category13: string | null;
  category14: string | null;
  category15: string | null;
  category16: string | null;
  category17: string | null;
  category18: string | null;
  category19: string | null;
  category2: string | null;
  category20: string | null;
  category21: string | null;
  category22: string | null;
  category23: string | null;
  category24: string | null;
  category25: string | null;
  category3: string | null;
  category4: string | null;
  category5: string | null;
  category6: string | null;
  category7: string | null;
  category8: string | null;
  category9: string | null;
}>;
type microsoft_graph_plannerUserIds = Partial<{}>;
type microsoft_graph_groupSetting = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    templateId: string | null;
    values: Array<microsoft_graph_settingValue>;
  }>;
type microsoft_graph_settingValue = Partial<{
  name: string | null;
  value: string | null;
}>;
type microsoft_graph_publicError = Partial<{
  code: string | null;
  details: Array<microsoft_graph_publicErrorDetail>;
  innerError:
    | (microsoft_graph_publicInnerError | {})
    | Array<microsoft_graph_publicInnerError | {}>;
  message: string | null;
  target: string | null;
}>;
type microsoft_graph_publicErrorDetail = Partial<{
  code: string | null;
  message: string | null;
  target: string | null;
}>;
type microsoft_graph_publicInnerError = Partial<{
  code: string | null;
  details: Array<microsoft_graph_publicErrorDetail>;
  message: string | null;
  target: string | null;
}>;
type microsoft_graph_root = Partial<{}>;
type microsoft_graph_siteCollection = Partial<{
  archivalDetails:
    | (microsoft_graph_siteArchivalDetails | {})
    | Array<microsoft_graph_siteArchivalDetails | {}>;
  dataLocationCode: string | null;
  hostname: string | null;
  root: (microsoft_graph_root | {}) | Array<microsoft_graph_root | {}>;
}>;
type microsoft_graph_siteArchivalDetails = Partial<{
  archiveStatus:
    | (microsoft_graph_siteArchiveStatus | {})
    | Array<microsoft_graph_siteArchiveStatus | {}>;
}>;
type microsoft_graph_siteArchiveStatus =
  | 'recentlyArchived'
  | 'fullyArchived'
  | 'reactivating'
  | 'unknownFutureValue';
type microsoft_graph_itemActionStat = Partial<{
  actionCount: number | null;
  actorCount: number | null;
}>;
type microsoft_graph_incompleteData = Partial<{
  missingDataBeforeDateTime: string | null;
  wasThrottled: boolean | null;
}>;
type microsoft_graph_accessAction = Partial<{}>;
type microsoft_graph_audio = Partial<{
  album: string | null;
  albumArtist: string | null;
  artist: string | null;
  bitrate: number | null;
  composers: string | null;
  copyright: string | null;
  disc: number | null;
  discCount: number | null;
  duration: number | null;
  genre: string | null;
  hasDrm: boolean | null;
  isVariableBitrate: boolean | null;
  title: string | null;
  track: number | null;
  trackCount: number | null;
  year: number | null;
}>;
type microsoft_graph_bundle = Partial<{
  album: (microsoft_graph_album | {}) | Array<microsoft_graph_album | {}>;
  childCount: number | null;
}>;
type microsoft_graph_album = Partial<{
  coverImageItemId: string | null;
}>;
type microsoft_graph_deleted = Partial<{
  state: string | null;
}>;
type microsoft_graph_file = Partial<{
  hashes: (microsoft_graph_hashes | {}) | Array<microsoft_graph_hashes | {}>;
  mimeType: string | null;
  processingMetadata: boolean | null;
}>;
type microsoft_graph_hashes = Partial<{
  crc32Hash: string | null;
  quickXorHash: string | null;
  sha1Hash: string | null;
  sha256Hash: string | null;
}>;
type microsoft_graph_fileSystemInfo = Partial<{
  createdDateTime: string | null;
  lastAccessedDateTime: string | null;
  lastModifiedDateTime: string | null;
}>;
type microsoft_graph_folder = Partial<{
  childCount: number | null;
  view: (microsoft_graph_folderView | {}) | Array<microsoft_graph_folderView | {}>;
}>;
type microsoft_graph_folderView = Partial<{
  sortBy: string | null;
  sortOrder: string | null;
  viewType: string | null;
}>;
type microsoft_graph_image = Partial<{
  height: number | null;
  width: number | null;
}>;
type microsoft_graph_geoCoordinates = Partial<{
  altitude: (number | null) | (string | null) | ReferenceNumeric;
  latitude: (number | null) | (string | null) | ReferenceNumeric;
  longitude: (number | null) | (string | null) | ReferenceNumeric;
}>;
type microsoft_graph_malware = Partial<{
  description: string | null;
}>;
type microsoft_graph_package = Partial<{
  type: string | null;
}>;
type microsoft_graph_pendingOperations = Partial<{
  pendingContentUpdate:
    | (microsoft_graph_pendingContentUpdate | {})
    | Array<microsoft_graph_pendingContentUpdate | {}>;
}>;
type microsoft_graph_pendingContentUpdate = Partial<{
  queuedDateTime: string | null;
}>;
type microsoft_graph_photo = Partial<{
  cameraMake: string | null;
  cameraModel: string | null;
  exposureDenominator: (number | null) | (string | null) | ReferenceNumeric;
  exposureNumerator: (number | null) | (string | null) | ReferenceNumeric;
  fNumber: (number | null) | (string | null) | ReferenceNumeric;
  focalLength: (number | null) | (string | null) | ReferenceNumeric;
  iso: number | null;
  orientation: number | null;
  takenDateTime: string | null;
}>;
type microsoft_graph_publicationFacet = Partial<{
  checkedOutBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  level: string | null;
  versionId: string | null;
}>;
type microsoft_graph_remoteItem = Partial<{
  createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  createdDateTime: string | null;
  file: (microsoft_graph_file | {}) | Array<microsoft_graph_file | {}>;
  fileSystemInfo:
    | (microsoft_graph_fileSystemInfo | {})
    | Array<microsoft_graph_fileSystemInfo | {}>;
  folder: (microsoft_graph_folder | {}) | Array<microsoft_graph_folder | {}>;
  id: string | null;
  image: (microsoft_graph_image | {}) | Array<microsoft_graph_image | {}>;
  lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  lastModifiedDateTime: string | null;
  name: string | null;
  package: (microsoft_graph_package | {}) | Array<microsoft_graph_package | {}>;
  parentReference: (microsoft_graph_itemReference | {}) | Array<microsoft_graph_itemReference | {}>;
  shared: (microsoft_graph_shared | {}) | Array<microsoft_graph_shared | {}>;
  sharepointIds: (microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>;
  size: number | null;
  specialFolder: (microsoft_graph_specialFolder | {}) | Array<microsoft_graph_specialFolder | {}>;
  video: (microsoft_graph_video | {}) | Array<microsoft_graph_video | {}>;
  webDavUrl: string | null;
  webUrl: string | null;
}>;
type microsoft_graph_shared = Partial<{
  owner: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  scope: string | null;
  sharedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  sharedDateTime: string | null;
}>;
type microsoft_graph_specialFolder = Partial<{
  name: string | null;
}>;
type microsoft_graph_video = Partial<{
  audioBitsPerSample: number | null;
  audioChannels: number | null;
  audioFormat: string | null;
  audioSamplesPerSecond: number | null;
  bitrate: number | null;
  duration: number | null;
  fourCC: string | null;
  frameRate: (number | null) | (string | null) | ReferenceNumeric;
  height: number | null;
  width: number | null;
}>;
type microsoft_graph_searchResult = Partial<{
  onClickTelemetryUrl: string | null;
}>;
type microsoft_graph_contentTypeInfo = Partial<{
  id: string | null;
  name: string | null;
}>;
type microsoft_graph_documentSetVersion = microsoft_graph_listItemVersion &
  Partial<{
    comment: string | null;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    items: Array<microsoft_graph_documentSetVersionItem>;
    shouldCaptureMinorVersion: boolean | null;
  }>;
type microsoft_graph_listItemVersion = microsoft_graph_baseItemVersion &
  Partial<{
    fields: (microsoft_graph_fieldValueSet | {}) | Array<microsoft_graph_fieldValueSet | {}>;
  }>;
type microsoft_graph_baseItemVersion = microsoft_graph_entity &
  Partial<{
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
    publication:
      | (microsoft_graph_publicationFacet | {})
      | Array<microsoft_graph_publicationFacet | {}>;
  }>;
type microsoft_graph_fieldValueSet = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_documentSetVersionItem = Partial<{
  itemId: string | null;
  title: string | null;
  versionId: string | null;
}>;
type microsoft_graph_permission = microsoft_graph_entity &
  Partial<{
    expirationDateTime: string | null;
    grantedTo: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    grantedToIdentities: Array<microsoft_graph_identitySet>;
    grantedToIdentitiesV2: Array<microsoft_graph_sharePointIdentitySet>;
    grantedToV2:
      | (microsoft_graph_sharePointIdentitySet | {})
      | Array<microsoft_graph_sharePointIdentitySet | {}>;
    hasPassword: boolean | null;
    inheritedFrom: (microsoft_graph_itemReference | {}) | Array<microsoft_graph_itemReference | {}>;
    invitation:
      | (microsoft_graph_sharingInvitation | {})
      | Array<microsoft_graph_sharingInvitation | {}>;
    link: (microsoft_graph_sharingLink | {}) | Array<microsoft_graph_sharingLink | {}>;
    roles: Array<string | null>;
    shareId: string | null;
  }>;
type microsoft_graph_sharePointIdentitySet = microsoft_graph_identitySet &
  Partial<{
    group: (microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>;
    siteGroup:
      | (microsoft_graph_sharePointIdentity | {})
      | Array<microsoft_graph_sharePointIdentity | {}>;
    siteUser:
      | (microsoft_graph_sharePointIdentity | {})
      | Array<microsoft_graph_sharePointIdentity | {}>;
  }>;
type microsoft_graph_sharePointIdentity = microsoft_graph_identity &
  Partial<{
    loginName: string | null;
  }>;
type microsoft_graph_sharingInvitation = Partial<{
  email: string | null;
  invitedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  redeemedBy: string | null;
  signInRequired: boolean | null;
}>;
type microsoft_graph_sharingLink = Partial<{
  application: (microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>;
  preventsDownload: boolean | null;
  scope: string | null;
  type: string | null;
  webHtml: string | null;
  webUrl: string | null;
}>;
type microsoft_graph_itemRetentionLabel = microsoft_graph_entity &
  Partial<{
    isLabelAppliedExplicitly: boolean | null;
    labelAppliedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    labelAppliedDateTime: string | null;
    name: string | null;
    retentionSettings:
      | (microsoft_graph_retentionLabelSettings | {})
      | Array<microsoft_graph_retentionLabelSettings | {}>;
  }>;
type microsoft_graph_retentionLabelSettings = Partial<{
  behaviorDuringRetentionPeriod:
    | (microsoft_graph_security_behaviorDuringRetentionPeriod | {})
    | Array<microsoft_graph_security_behaviorDuringRetentionPeriod | {}>;
  isContentUpdateAllowed: boolean | null;
  isDeleteAllowed: boolean | null;
  isLabelUpdateAllowed: boolean | null;
  isMetadataUpdateAllowed: boolean | null;
  isRecordLocked: boolean | null;
}>;
type microsoft_graph_security_behaviorDuringRetentionPeriod =
  | 'doNotRetain'
  | 'retain'
  | 'retainAsRecord'
  | 'retainAsRegulatoryRecord'
  | 'unknownFutureValue';
type microsoft_graph_subscription = microsoft_graph_entity &
  Partial<{
    applicationId: string | null;
    changeType: string;
    clientState: string | null;
    creatorId: string | null;
    encryptionCertificate: string | null;
    encryptionCertificateId: string | null;
    expirationDateTime: string;
    includeResourceData: boolean | null;
    latestSupportedTlsVersion: string | null;
    lifecycleNotificationUrl: string | null;
    notificationQueryOptions: string | null;
    notificationUrl: string;
    notificationUrlAppId: string | null;
    resource: string;
  }>;
type microsoft_graph_thumbnailSet = microsoft_graph_entity &
  Partial<{
    large: (microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>;
    medium: (microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>;
    small: (microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>;
    source: (microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>;
  }>;
type microsoft_graph_thumbnail = Partial<{
  content: string | null;
  height: number | null;
  sourceItemId: string | null;
  url: string | null;
  width: number | null;
}>;
type microsoft_graph_driveItemVersion = microsoft_graph_baseItemVersion &
  Partial<{
    content: string | null;
    size: number | null;
  }>;
type microsoft_graph_workbook = microsoft_graph_entity &
  Partial<{
    application:
      | (microsoft_graph_workbookApplication | {})
      | Array<microsoft_graph_workbookApplication | {}>;
    comments: Array<microsoft_graph_workbookComment>;
    functions:
      | (microsoft_graph_workbookFunctions | {})
      | Array<microsoft_graph_workbookFunctions | {}>;
    names: Array<microsoft_graph_workbookNamedItem>;
    operations: Array<microsoft_graph_workbookOperation>;
    tables: Array<microsoft_graph_workbookTable>;
    worksheets: Array<microsoft_graph_workbookWorksheet>;
  }>;
type microsoft_graph_workbookApplication = microsoft_graph_entity &
  Partial<{
    calculationMode: string;
  }>;
type microsoft_graph_workbookComment = microsoft_graph_entity &
  Partial<{
    content: string | null;
    contentType: string;
    replies: Array<microsoft_graph_workbookCommentReply>;
  }>;
type microsoft_graph_workbookCommentReply = microsoft_graph_entity &
  Partial<{
    content: string | null;
    contentType: string;
  }>;
type microsoft_graph_workbookFunctions = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_workbookChartAxes = microsoft_graph_entity &
  Partial<{
    categoryAxis:
      | (microsoft_graph_workbookChartAxis | {})
      | Array<microsoft_graph_workbookChartAxis | {}>;
    seriesAxis:
      | (microsoft_graph_workbookChartAxis | {})
      | Array<microsoft_graph_workbookChartAxis | {}>;
    valueAxis:
      | (microsoft_graph_workbookChartAxis | {})
      | Array<microsoft_graph_workbookChartAxis | {}>;
  }>;
type microsoft_graph_workbookChartAxis = microsoft_graph_entity &
  Partial<{
    majorUnit: unknown;
    maximum: unknown;
    minimum: unknown;
    minorUnit: unknown;
    format:
      | (microsoft_graph_workbookChartAxisFormat | {})
      | Array<microsoft_graph_workbookChartAxisFormat | {}>;
    majorGridlines:
      | (microsoft_graph_workbookChartGridlines | {})
      | Array<microsoft_graph_workbookChartGridlines | {}>;
    minorGridlines:
      | (microsoft_graph_workbookChartGridlines | {})
      | Array<microsoft_graph_workbookChartGridlines | {}>;
    title:
      | (microsoft_graph_workbookChartAxisTitle | {})
      | Array<microsoft_graph_workbookChartAxisTitle | {}>;
  }>;
type microsoft_graph_workbookChartAxisFormat = microsoft_graph_entity &
  Partial<{
    font: (microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>;
    line:
      | (microsoft_graph_workbookChartLineFormat | {})
      | Array<microsoft_graph_workbookChartLineFormat | {}>;
  }>;
type microsoft_graph_workbookChartFont = microsoft_graph_entity &
  Partial<{
    bold: boolean | null;
    color: string | null;
    italic: boolean | null;
    name: string | null;
    size: (number | null) | (string | null) | ReferenceNumeric;
    underline: string | null;
  }>;
type microsoft_graph_workbookChartLineFormat = microsoft_graph_entity &
  Partial<{
    color: string | null;
  }>;
type microsoft_graph_workbookChartGridlines = microsoft_graph_entity &
  Partial<{
    visible: boolean;
    format:
      | (microsoft_graph_workbookChartGridlinesFormat | {})
      | Array<microsoft_graph_workbookChartGridlinesFormat | {}>;
  }>;
type microsoft_graph_workbookChartGridlinesFormat = microsoft_graph_entity &
  Partial<{
    line:
      | (microsoft_graph_workbookChartLineFormat | {})
      | Array<microsoft_graph_workbookChartLineFormat | {}>;
  }>;
type microsoft_graph_workbookChartAxisTitle = microsoft_graph_entity &
  Partial<{
    text: string | null;
    visible: boolean;
    format:
      | (microsoft_graph_workbookChartAxisTitleFormat | {})
      | Array<microsoft_graph_workbookChartAxisTitleFormat | {}>;
  }>;
type microsoft_graph_workbookChartAxisTitleFormat = microsoft_graph_entity &
  Partial<{
    font: (microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>;
  }>;
type microsoft_graph_workbookChartDataLabels = microsoft_graph_entity &
  Partial<{
    position: string | null;
    separator: string | null;
    showBubbleSize: boolean | null;
    showCategoryName: boolean | null;
    showLegendKey: boolean | null;
    showPercentage: boolean | null;
    showSeriesName: boolean | null;
    showValue: boolean | null;
    format:
      | (microsoft_graph_workbookChartDataLabelFormat | {})
      | Array<microsoft_graph_workbookChartDataLabelFormat | {}>;
  }>;
type microsoft_graph_workbookChartDataLabelFormat = microsoft_graph_entity &
  Partial<{
    fill: (microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>;
    font: (microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>;
  }>;
type microsoft_graph_workbookChartFill = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_workbookChartAreaFormat = microsoft_graph_entity &
  Partial<{
    fill: (microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>;
    font: (microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>;
  }>;
type microsoft_graph_workbookChartLegend = microsoft_graph_entity &
  Partial<{
    overlay: boolean | null;
    position: string | null;
    visible: boolean;
    format:
      | (microsoft_graph_workbookChartLegendFormat | {})
      | Array<microsoft_graph_workbookChartLegendFormat | {}>;
  }>;
type microsoft_graph_workbookChartLegendFormat = microsoft_graph_entity &
  Partial<{
    fill: (microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>;
    font: (microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>;
  }>;
type microsoft_graph_workbookChartSeries = microsoft_graph_entity &
  Partial<{
    name: string | null;
    format:
      | (microsoft_graph_workbookChartSeriesFormat | {})
      | Array<microsoft_graph_workbookChartSeriesFormat | {}>;
    points: Array<microsoft_graph_workbookChartPoint>;
  }>;
type microsoft_graph_workbookChartSeriesFormat = microsoft_graph_entity &
  Partial<{
    fill: (microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>;
    line:
      | (microsoft_graph_workbookChartLineFormat | {})
      | Array<microsoft_graph_workbookChartLineFormat | {}>;
  }>;
type microsoft_graph_workbookChartPoint = microsoft_graph_entity &
  Partial<{
    value: unknown;
    format:
      | (microsoft_graph_workbookChartPointFormat | {})
      | Array<microsoft_graph_workbookChartPointFormat | {}>;
  }>;
type microsoft_graph_workbookChartPointFormat = microsoft_graph_entity &
  Partial<{
    fill: (microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>;
  }>;
type microsoft_graph_workbookChartTitle = microsoft_graph_entity &
  Partial<{
    overlay: boolean | null;
    text: string | null;
    visible: boolean;
    format:
      | (microsoft_graph_workbookChartTitleFormat | {})
      | Array<microsoft_graph_workbookChartTitleFormat | {}>;
  }>;
type microsoft_graph_workbookChartTitleFormat = microsoft_graph_entity &
  Partial<{
    fill: (microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>;
    font: (microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>;
  }>;
type microsoft_graph_workbookWorksheetProtection = microsoft_graph_entity &
  Partial<{
    options:
      | (microsoft_graph_workbookWorksheetProtectionOptions | {})
      | Array<microsoft_graph_workbookWorksheetProtectionOptions | {}>;
    protected: boolean;
  }>;
type microsoft_graph_workbookWorksheetProtectionOptions = Partial<{
  allowAutoFilter: boolean;
  allowDeleteColumns: boolean;
  allowDeleteRows: boolean;
  allowFormatCells: boolean;
  allowFormatColumns: boolean;
  allowFormatRows: boolean;
  allowInsertColumns: boolean;
  allowInsertHyperlinks: boolean;
  allowInsertRows: boolean;
  allowPivotTables: boolean;
  allowSort: boolean;
}>;
type microsoft_graph_workbookTableColumn = microsoft_graph_entity &
  Partial<{
    index: number;
    name: string | null;
    values: unknown;
    filter: (microsoft_graph_workbookFilter | {}) | Array<microsoft_graph_workbookFilter | {}>;
  }>;
type microsoft_graph_workbookFilter = microsoft_graph_entity &
  Partial<{
    criteria:
      | (microsoft_graph_workbookFilterCriteria | {})
      | Array<microsoft_graph_workbookFilterCriteria | {}>;
  }>;
type microsoft_graph_workbookFilterCriteria = Partial<{
  color: string | null;
  criterion1: string | null;
  criterion2: string | null;
  dynamicCriteria: string;
  filterOn: string;
  icon: (microsoft_graph_workbookIcon | {}) | Array<microsoft_graph_workbookIcon | {}>;
  operator: string;
  values: unknown;
}>;
type microsoft_graph_workbookIcon = Partial<{
  index: number;
  set: string;
}>;
type microsoft_graph_workbookTableRow = microsoft_graph_entity &
  Partial<{
    index: number;
    values: unknown;
  }>;
type microsoft_graph_workbookTableSort = microsoft_graph_entity &
  Partial<{
    fields: Array<microsoft_graph_workbookSortField>;
    matchCase: boolean;
    method: string;
  }>;
type microsoft_graph_workbookSortField = Partial<{
  ascending: boolean;
  color: string | null;
  dataOption: string;
  icon: (microsoft_graph_workbookIcon | {}) | Array<microsoft_graph_workbookIcon | {}>;
  key: number;
  sortOn: string;
}>;
type microsoft_graph_workbookOperation = microsoft_graph_entity &
  Partial<{
    error:
      | (microsoft_graph_workbookOperationError | {})
      | Array<microsoft_graph_workbookOperationError | {}>;
    resourceLocation: string | null;
    status: microsoft_graph_workbookOperationStatus;
  }>;
type microsoft_graph_workbookOperationStatus = 'notStarted' | 'running' | 'succeeded' | 'failed';
type microsoft_graph_booleanColumn = Partial<{}>;
type microsoft_graph_calculatedColumn = Partial<{
  format: string | null;
  formula: string | null;
  outputType: string | null;
}>;
type microsoft_graph_choiceColumn = Partial<{
  allowTextEntry: boolean | null;
  choices: Array<string | null>;
  displayAs: string | null;
}>;
type microsoft_graph_contentApprovalStatusColumn = Partial<{}>;
type microsoft_graph_currencyColumn = Partial<{
  locale: string | null;
}>;
type microsoft_graph_dateTimeColumn = Partial<{
  displayAs: string | null;
  format: string | null;
}>;
type microsoft_graph_defaultColumnValue = Partial<{
  formula: string | null;
  value: string | null;
}>;
type microsoft_graph_geolocationColumn = Partial<{}>;
type microsoft_graph_hyperlinkOrPictureColumn = Partial<{
  isPicture: boolean | null;
}>;
type microsoft_graph_lookupColumn = Partial<{
  allowMultipleValues: boolean | null;
  allowUnlimitedLength: boolean | null;
  columnName: string | null;
  listId: string | null;
  primaryLookupColumnId: string | null;
}>;
type microsoft_graph_numberColumn = Partial<{
  decimalPlaces: string | null;
  displayAs: string | null;
  maximum: (number | null) | (string | null) | ReferenceNumeric;
  minimum: (number | null) | (string | null) | ReferenceNumeric;
}>;
type microsoft_graph_personOrGroupColumn = Partial<{
  allowMultipleSelection: boolean | null;
  chooseFromType: string | null;
  displayAs: string | null;
}>;
type microsoft_graph_termColumn = Partial<{
  allowMultipleValues: boolean | null;
  showFullyQualifiedName: boolean | null;
  parentTerm: (microsoft_graph_termStore_term | {}) | Array<microsoft_graph_termStore_term | {}>;
  termSet: (microsoft_graph_termStore_set | {}) | Array<microsoft_graph_termStore_set | {}>;
}>;
type microsoft_graph_termStore_localizedDescription = Partial<{
  description: string | null;
  languageTag: string | null;
}>;
type microsoft_graph_termStore_localizedLabel = Partial<{
  isDefault: boolean | null;
  languageTag: string | null;
  name: string | null;
}>;
type microsoft_graph_keyValue = Partial<{
  key: string | null;
  value: string | null;
}>;
type microsoft_graph_termStore_relationType = 'pin' | 'reuse' | 'unknownFutureValue';
type microsoft_graph_termStore_localizedName = Partial<{
  languageTag: string | null;
  name: string | null;
}>;
type microsoft_graph_termStore_termGroupScope =
  | 'global'
  | 'system'
  | 'siteCollection'
  | 'unknownFutureValue';
type microsoft_graph_textColumn = Partial<{
  allowMultipleLines: boolean | null;
  appendChangesToExistingText: boolean | null;
  linesForEditing: number | null;
  maxLength: number | null;
  textType: string | null;
}>;
type microsoft_graph_thumbnailColumn = Partial<{}>;
type microsoft_graph_columnTypes =
  | 'note'
  | 'text'
  | 'choice'
  | 'multichoice'
  | 'number'
  | 'currency'
  | 'dateTime'
  | 'lookup'
  | 'boolean'
  | 'user'
  | 'url'
  | 'calculated'
  | 'location'
  | 'geolocation'
  | 'term'
  | 'multiterm'
  | 'thumbnail'
  | 'approvalStatus'
  | 'unknownFutureValue';
type microsoft_graph_columnValidation = Partial<{
  defaultLanguage: string | null;
  descriptions: Array<microsoft_graph_displayNameLocalization>;
  formula: string | null;
}>;
type microsoft_graph_displayNameLocalization = Partial<{
  displayName: string | null;
  languageTag: string | null;
}>;
type microsoft_graph_documentSet = Partial<{
  allowedContentTypes: Array<microsoft_graph_contentTypeInfo>;
  defaultContents: Array<microsoft_graph_documentSetContent>;
  propagateWelcomePageChanges: boolean | null;
  shouldPrefixNameToFile: boolean | null;
  welcomePageUrl: string | null;
  sharedColumns: Array<microsoft_graph_columnDefinition>;
  welcomePageColumns: Array<microsoft_graph_columnDefinition>;
}>;
type microsoft_graph_documentSetContent = Partial<{
  contentType: (microsoft_graph_contentTypeInfo | {}) | Array<microsoft_graph_contentTypeInfo | {}>;
  fileName: string | null;
  folderName: string | null;
}>;
type microsoft_graph_contentTypeOrder = Partial<{
  default: boolean | null;
  position: number | null;
}>;
type microsoft_graph_columnLink = microsoft_graph_entity &
  Partial<{
    name: string | null;
  }>;
type microsoft_graph_listInfo = Partial<{
  contentTypesEnabled: boolean | null;
  hidden: boolean | null;
  template: string | null;
}>;
type microsoft_graph_systemFacet = Partial<{}>;
type microsoft_graph_richLongRunningOperation = microsoft_graph_longRunningOperation &
  Partial<{
    error: (microsoft_graph_publicError | {}) | Array<microsoft_graph_publicError | {}>;
    percentageComplete: number | null;
    resourceId: string | null;
    type: string | null;
  }>;
type microsoft_graph_longRunningOperation = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    lastActionDateTime: string | null;
    resourceLocation: string | null;
    status:
      | (microsoft_graph_longRunningOperationStatus | {})
      | Array<microsoft_graph_longRunningOperationStatus | {}>;
    statusDetail: string | null;
  }>;
type microsoft_graph_longRunningOperationStatus =
  | 'notStarted'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'unknownFutureValue';
type microsoft_graph_pageLayoutType =
  | 'microsoftReserved'
  | 'article'
  | 'home'
  | 'unknownFutureValue';
type microsoft_graph_termStore_store = microsoft_graph_entity &
  Partial<{
    defaultLanguageTag: string;
    languageTags: Array<string>;
    groups: Array<microsoft_graph_termStore_group>;
    sets: Array<microsoft_graph_termStore_set>;
  }>;
type microsoft_graph_teamFunSettings = Partial<{
  allowCustomMemes: boolean | null;
  allowGiphy: boolean | null;
  allowStickersAndMemes: boolean | null;
  giphyContentRating:
    | (microsoft_graph_giphyRatingType | {})
    | Array<microsoft_graph_giphyRatingType | {}>;
}>;
type microsoft_graph_giphyRatingType = 'strict' | 'moderate' | 'unknownFutureValue';
type microsoft_graph_teamGuestSettings = Partial<{
  allowCreateUpdateChannels: boolean | null;
  allowDeleteChannels: boolean | null;
}>;
type microsoft_graph_teamMemberSettings = Partial<{
  allowAddRemoveApps: boolean | null;
  allowCreatePrivateChannels: boolean | null;
  allowCreateUpdateChannels: boolean | null;
  allowCreateUpdateRemoveConnectors: boolean | null;
  allowCreateUpdateRemoveTabs: boolean | null;
  allowDeleteChannels: boolean | null;
}>;
type microsoft_graph_teamMessagingSettings = Partial<{
  allowChannelMentions: boolean | null;
  allowOwnerDeleteMessages: boolean | null;
  allowTeamMentions: boolean | null;
  allowUserDeleteMessages: boolean | null;
  allowUserEditMessages: boolean | null;
}>;
type microsoft_graph_teamSpecialization =
  | 'none'
  | 'educationStandard'
  | 'educationClass'
  | 'educationProfessionalLearningCommunity'
  | 'educationStaff'
  | 'healthcareStandard'
  | 'healthcareCareCoordination'
  | 'unknownFutureValue';
type microsoft_graph_teamSummary = Partial<{
  guestsCount: number | null;
  membersCount: number | null;
  ownersCount: number | null;
}>;
type microsoft_graph_teamVisibilityType =
  | 'private'
  | 'public'
  | 'hiddenMembership'
  | 'unknownFutureValue';
type microsoft_graph_channelMembershipType =
  | 'standard'
  | 'private'
  | 'unknownFutureValue'
  | 'shared';
type microsoft_graph_channelSummary = Partial<{
  guestsCount: number | null;
  hasMembersFromOtherTenants: boolean | null;
  membersCount: number | null;
  ownersCount: number | null;
}>;
type microsoft_graph_conversationMember = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    roles: Array<string | null>;
    visibleHistoryStartDateTime: string | null;
  }>;
type microsoft_graph_chatMessageAttachment = Partial<{
  content: string | null;
  contentType: string | null;
  contentUrl: string | null;
  id: string | null;
  name: string | null;
  teamsAppId: string | null;
  thumbnailUrl: string | null;
}>;
type microsoft_graph_channelIdentity = Partial<{
  channelId: string | null;
  teamId: string | null;
}>;
type microsoft_graph_eventMessageDetail = Partial<{}>;
type microsoft_graph_chatMessageFromIdentitySet = microsoft_graph_identitySet & Partial<{}>;
type microsoft_graph_chatMessageImportance = 'normal' | 'high' | 'urgent' | 'unknownFutureValue';
type microsoft_graph_chatMessageMention = Partial<{
  id: number | null;
  mentioned:
    | (microsoft_graph_chatMessageMentionedIdentitySet | {})
    | Array<microsoft_graph_chatMessageMentionedIdentitySet | {}>;
  mentionText: string | null;
}>;
type microsoft_graph_chatMessageMentionedIdentitySet = microsoft_graph_identitySet &
  Partial<{
    conversation:
      | (microsoft_graph_teamworkConversationIdentity | {})
      | Array<microsoft_graph_teamworkConversationIdentity | {}>;
  }>;
type microsoft_graph_teamworkConversationIdentity = microsoft_graph_identity &
  Partial<{
    conversationIdentityType:
      | (microsoft_graph_teamworkConversationIdentityType | {})
      | Array<microsoft_graph_teamworkConversationIdentityType | {}>;
  }>;
type microsoft_graph_teamworkConversationIdentityType =
  | 'team'
  | 'channel'
  | 'chat'
  | 'unknownFutureValue';
type microsoft_graph_chatMessageHistoryItem = Partial<{
  actions: microsoft_graph_chatMessageActions;
  modifiedDateTime: string;
  reaction:
    | (microsoft_graph_chatMessageReaction | {})
    | Array<microsoft_graph_chatMessageReaction | {}>;
}>;
type microsoft_graph_chatMessageActions =
  | 'reactionAdded'
  | 'reactionRemoved'
  | 'actionUndefined'
  | 'unknownFutureValue';
type microsoft_graph_chatMessageReaction = Partial<{
  createdDateTime: string;
  displayName: string | null;
  reactionContentUrl: string | null;
  reactionType: string;
  user: microsoft_graph_chatMessageReactionIdentitySet;
}>;
type microsoft_graph_chatMessageReactionIdentitySet = microsoft_graph_identitySet & Partial<{}>;
type microsoft_graph_chatMessageType =
  | 'message'
  | 'chatEvent'
  | 'typing'
  | 'unknownFutureValue'
  | 'systemEventMessage';
type microsoft_graph_chatMessagePolicyViolation = Partial<{
  dlpAction:
    | (microsoft_graph_chatMessagePolicyViolationDlpActionTypes | {})
    | Array<microsoft_graph_chatMessagePolicyViolationDlpActionTypes | {}>;
  justificationText: string | null;
  policyTip:
    | (microsoft_graph_chatMessagePolicyViolationPolicyTip | {})
    | Array<microsoft_graph_chatMessagePolicyViolationPolicyTip | {}>;
  userAction:
    | (microsoft_graph_chatMessagePolicyViolationUserActionTypes | {})
    | Array<microsoft_graph_chatMessagePolicyViolationUserActionTypes | {}>;
  verdictDetails:
    | (microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes | {})
    | Array<microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes | {}>;
}>;
type microsoft_graph_chatMessagePolicyViolationDlpActionTypes =
  | 'none'
  | 'notifySender'
  | 'blockAccess'
  | 'blockAccessExternal';
type microsoft_graph_chatMessagePolicyViolationPolicyTip = Partial<{
  complianceUrl: string | null;
  generalText: string | null;
  matchedConditionDescriptions: Array<string | null>;
}>;
type microsoft_graph_chatMessagePolicyViolationUserActionTypes =
  | 'none'
  | 'override'
  | 'reportFalsePositive';
type microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes =
  | 'none'
  | 'allowFalsePositiveOverride'
  | 'allowOverrideWithoutJustification'
  | 'allowOverrideWithJustification';
type microsoft_graph_chatMessageHostedContent = microsoft_graph_teamworkHostedContent & Partial<{}>;
type microsoft_graph_teamworkHostedContent = microsoft_graph_entity &
  Partial<{
    contentBytes: string | null;
    contentType: string | null;
  }>;
type microsoft_graph_teamsTab = microsoft_graph_entity &
  Partial<{
    configuration:
      | (microsoft_graph_teamsTabConfiguration | {})
      | Array<microsoft_graph_teamsTabConfiguration | {}>;
    displayName: string | null;
    webUrl: string | null;
    teamsApp: (microsoft_graph_teamsApp | {}) | Array<microsoft_graph_teamsApp | {}>;
  }>;
type microsoft_graph_teamsTabConfiguration = Partial<{
  contentUrl: string | null;
  entityId: string | null;
  removeUrl: string | null;
  websiteUrl: string | null;
}>;
type microsoft_graph_teamsApp = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    distributionMethod:
      | (microsoft_graph_teamsAppDistributionMethod | {})
      | Array<microsoft_graph_teamsAppDistributionMethod | {}>;
    externalId: string | null;
    appDefinitions: Array<microsoft_graph_teamsAppDefinition>;
  }>;
type microsoft_graph_teamsAppDistributionMethod =
  | 'store'
  | 'organization'
  | 'sideloaded'
  | 'unknownFutureValue';
type microsoft_graph_teamsAppDefinition = microsoft_graph_entity &
  Partial<{
    authorization:
      | (microsoft_graph_teamsAppAuthorization | {})
      | Array<microsoft_graph_teamsAppAuthorization | {}>;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    description: string | null;
    displayName: string | null;
    lastModifiedDateTime: string | null;
    publishingState:
      | (microsoft_graph_teamsAppPublishingState | {})
      | Array<microsoft_graph_teamsAppPublishingState | {}>;
    shortDescription: string | null;
    teamsAppId: string | null;
    version: string | null;
    bot: (microsoft_graph_teamworkBot | {}) | Array<microsoft_graph_teamworkBot | {}>;
  }>;
type microsoft_graph_teamsAppAuthorization = Partial<{
  clientAppId: string | null;
  requiredPermissionSet:
    | (microsoft_graph_teamsAppPermissionSet | {})
    | Array<microsoft_graph_teamsAppPermissionSet | {}>;
}>;
type microsoft_graph_teamsAppPermissionSet = Partial<{
  resourceSpecificPermissions: Array<microsoft_graph_teamsAppResourceSpecificPermission>;
}>;
type microsoft_graph_teamsAppResourceSpecificPermission = Partial<{
  permissionType:
    | (microsoft_graph_teamsAppResourceSpecificPermissionType | {})
    | Array<microsoft_graph_teamsAppResourceSpecificPermissionType | {}>;
  permissionValue: string | null;
}>;
type microsoft_graph_teamsAppResourceSpecificPermissionType =
  | 'delegated'
  | 'application'
  | 'unknownFutureValue';
type microsoft_graph_teamsAppPublishingState =
  | 'submitted'
  | 'rejected'
  | 'published'
  | 'unknownFutureValue';
type microsoft_graph_teamworkBot = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_teamsAppInstallation = microsoft_graph_entity &
  Partial<{
    consentedPermissionSet:
      | (microsoft_graph_teamsAppPermissionSet | {})
      | Array<microsoft_graph_teamsAppPermissionSet | {}>;
    teamsApp: (microsoft_graph_teamsApp | {}) | Array<microsoft_graph_teamsApp | {}>;
    teamsAppDefinition:
      | (microsoft_graph_teamsAppDefinition | {})
      | Array<microsoft_graph_teamsAppDefinition | {}>;
  }>;
type microsoft_graph_teamsAsyncOperation = microsoft_graph_entity &
  Partial<{
    attemptsCount: number;
    createdDateTime: string;
    error: (microsoft_graph_operationError | {}) | Array<microsoft_graph_operationError | {}>;
    lastActionDateTime: string;
    operationType: microsoft_graph_teamsAsyncOperationType;
    status: microsoft_graph_teamsAsyncOperationStatus;
    targetResourceId: string | null;
    targetResourceLocation: string | null;
  }>;
type microsoft_graph_operationError = Partial<{
  code: string | null;
  message: string | null;
}>;
type microsoft_graph_teamsAsyncOperationType =
  | 'invalid'
  | 'cloneTeam'
  | 'archiveTeam'
  | 'unarchiveTeam'
  | 'createTeam'
  | 'unknownFutureValue'
  | 'teamifyGroup'
  | 'createChannel'
  | 'archiveChannel'
  | 'unarchiveChannel';
type microsoft_graph_teamsAsyncOperationStatus =
  | 'invalid'
  | 'notStarted'
  | 'inProgress'
  | 'succeeded'
  | 'failed'
  | 'unknownFutureValue';
type microsoft_graph_schedule = microsoft_graph_entity &
  Partial<{
    enabled: boolean | null;
    isActivitiesIncludedWhenCopyingShiftsEnabled: boolean | null;
    offerShiftRequestsEnabled: boolean | null;
    openShiftsEnabled: boolean | null;
    provisionStatus:
      | (microsoft_graph_operationStatus | {})
      | Array<microsoft_graph_operationStatus | {}>;
    provisionStatusCode: string | null;
    startDayOfWeek: (microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>;
    swapShiftsRequestsEnabled: boolean | null;
    timeClockEnabled: boolean | null;
    timeClockSettings:
      | (microsoft_graph_timeClockSettings | {})
      | Array<microsoft_graph_timeClockSettings | {}>;
    timeOffRequestsEnabled: boolean | null;
    timeZone: string | null;
    workforceIntegrationIds: Array<string | null>;
    dayNotes: Array<microsoft_graph_dayNote>;
    offerShiftRequests: Array<microsoft_graph_offerShiftRequest>;
    openShiftChangeRequests: Array<microsoft_graph_openShiftChangeRequest>;
    openShifts: Array<microsoft_graph_openShift>;
    schedulingGroups: Array<microsoft_graph_schedulingGroup>;
    shifts: Array<microsoft_graph_shift>;
    swapShiftsChangeRequests: Array<microsoft_graph_swapShiftsChangeRequest>;
    timeCards: Array<microsoft_graph_timeCard>;
    timeOffReasons: Array<microsoft_graph_timeOffReason>;
    timeOffRequests: Array<microsoft_graph_timeOffRequest>;
    timesOff: Array<microsoft_graph_timeOff>;
  }>;
type microsoft_graph_timeClockSettings = Partial<{
  approvedLocation:
    | (microsoft_graph_geoCoordinates | {})
    | Array<microsoft_graph_geoCoordinates | {}>;
}>;
type microsoft_graph_dayNote = microsoft_graph_changeTrackedEntity &
  Partial<{
    dayNoteDate: string | null;
    draftDayNote: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    sharedDayNote: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
  }>;
type microsoft_graph_changeTrackedEntity = microsoft_graph_entity &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
  }>;
type microsoft_graph_offerShiftRequest = microsoft_graph_scheduleChangeRequest &
  Partial<{
    recipientActionDateTime: string | null;
    recipientActionMessage: string | null;
    recipientUserId: string | null;
    senderShiftId: string | null;
  }>;
type microsoft_graph_scheduleChangeRequest = microsoft_graph_changeTrackedEntity &
  Partial<{
    assignedTo:
      | (microsoft_graph_scheduleChangeRequestActor | {})
      | Array<microsoft_graph_scheduleChangeRequestActor | {}>;
    managerActionDateTime: string | null;
    managerActionMessage: string | null;
    managerUserId: string | null;
    senderDateTime: string | null;
    senderMessage: string | null;
    senderUserId: string | null;
    state:
      | (microsoft_graph_scheduleChangeState | {})
      | Array<microsoft_graph_scheduleChangeState | {}>;
  }>;
type microsoft_graph_scheduleChangeRequestActor =
  | 'sender'
  | 'recipient'
  | 'manager'
  | 'system'
  | 'unknownFutureValue';
type microsoft_graph_scheduleChangeState =
  | 'pending'
  | 'approved'
  | 'declined'
  | 'unknownFutureValue';
type microsoft_graph_openShiftChangeRequest = microsoft_graph_scheduleChangeRequest &
  Partial<{
    openShiftId: string | null;
  }>;
type microsoft_graph_openShift = microsoft_graph_changeTrackedEntity &
  Partial<{
    draftOpenShift:
      | (microsoft_graph_openShiftItem | {})
      | Array<microsoft_graph_openShiftItem | {}>;
    isStagedForDeletion: boolean | null;
    schedulingGroupId: string | null;
    sharedOpenShift:
      | (microsoft_graph_openShiftItem | {})
      | Array<microsoft_graph_openShiftItem | {}>;
  }>;
type microsoft_graph_openShiftItem = microsoft_graph_shiftItem &
  Partial<{
    openSlotCount: number;
  }>;
type microsoft_graph_shiftItem = microsoft_graph_scheduleEntity &
  Partial<{
    activities: Array<microsoft_graph_shiftActivity>;
    displayName: string | null;
    notes: string | null;
  }>;
type microsoft_graph_scheduleEntity = Partial<{
  endDateTime: string | null;
  startDateTime: string | null;
  theme: microsoft_graph_scheduleEntityTheme;
}>;
type microsoft_graph_scheduleEntityTheme =
  | 'white'
  | 'blue'
  | 'green'
  | 'purple'
  | 'pink'
  | 'yellow'
  | 'gray'
  | 'darkBlue'
  | 'darkGreen'
  | 'darkPurple'
  | 'darkPink'
  | 'darkYellow'
  | 'unknownFutureValue';
type microsoft_graph_shiftActivity = Partial<{
  code: string | null;
  displayName: string | null;
  endDateTime: string | null;
  isPaid: boolean | null;
  startDateTime: string | null;
  theme: microsoft_graph_scheduleEntityTheme;
}>;
type microsoft_graph_schedulingGroup = microsoft_graph_changeTrackedEntity &
  Partial<{
    code: string | null;
    displayName: string | null;
    isActive: boolean | null;
    userIds: Array<string | null>;
  }>;
type microsoft_graph_shift = microsoft_graph_changeTrackedEntity &
  Partial<{
    draftShift: (microsoft_graph_shiftItem | {}) | Array<microsoft_graph_shiftItem | {}>;
    isStagedForDeletion: boolean | null;
    schedulingGroupId: string | null;
    sharedShift: (microsoft_graph_shiftItem | {}) | Array<microsoft_graph_shiftItem | {}>;
    userId: string | null;
  }>;
type microsoft_graph_swapShiftsChangeRequest = microsoft_graph_offerShiftRequest &
  Partial<{
    recipientShiftId: string | null;
  }>;
type microsoft_graph_timeCard = microsoft_graph_changeTrackedEntity &
  Partial<{
    breaks: Array<microsoft_graph_timeCardBreak>;
    clockInEvent: (microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>;
    clockOutEvent: (microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>;
    confirmedBy: (microsoft_graph_confirmedBy | {}) | Array<microsoft_graph_confirmedBy | {}>;
    notes: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    originalEntry: (microsoft_graph_timeCardEntry | {}) | Array<microsoft_graph_timeCardEntry | {}>;
    state: (microsoft_graph_timeCardState | {}) | Array<microsoft_graph_timeCardState | {}>;
    userId: string | null;
  }>;
type microsoft_graph_timeCardBreak = Partial<{
  breakId: string | null;
  end: (microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>;
  notes: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
  start: microsoft_graph_timeCardEvent;
}>;
type microsoft_graph_timeCardEvent = Partial<{
  dateTime: string;
  isAtApprovedLocation: boolean | null;
  notes: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
}>;
type microsoft_graph_confirmedBy = 'none' | 'user' | 'manager' | 'unknownFutureValue';
type microsoft_graph_timeCardEntry = Partial<{
  breaks: Array<microsoft_graph_timeCardBreak>;
  clockInEvent: (microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>;
  clockOutEvent: (microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>;
}>;
type microsoft_graph_timeCardState = 'clockedIn' | 'onBreak' | 'clockedOut' | 'unknownFutureValue';
type microsoft_graph_timeOffReason = microsoft_graph_changeTrackedEntity &
  Partial<{
    code: string | null;
    displayName: string | null;
    iconType:
      | (microsoft_graph_timeOffReasonIconType | {})
      | Array<microsoft_graph_timeOffReasonIconType | {}>;
    isActive: boolean | null;
  }>;
type microsoft_graph_timeOffReasonIconType =
  | 'none'
  | 'car'
  | 'calendar'
  | 'running'
  | 'plane'
  | 'firstAid'
  | 'doctor'
  | 'notWorking'
  | 'clock'
  | 'juryDuty'
  | 'globe'
  | 'cup'
  | 'phone'
  | 'weather'
  | 'umbrella'
  | 'piggyBank'
  | 'dog'
  | 'cake'
  | 'trafficCone'
  | 'pin'
  | 'sunny'
  | 'unknownFutureValue';
type microsoft_graph_timeOffRequest = microsoft_graph_scheduleChangeRequest &
  Partial<{
    endDateTime: string | null;
    startDateTime: string | null;
    timeOffReasonId: string | null;
  }>;
type microsoft_graph_timeOff = microsoft_graph_changeTrackedEntity &
  Partial<{
    draftTimeOff: (microsoft_graph_timeOffItem | {}) | Array<microsoft_graph_timeOffItem | {}>;
    isStagedForDeletion: boolean | null;
    sharedTimeOff: (microsoft_graph_timeOffItem | {}) | Array<microsoft_graph_timeOffItem | {}>;
    userId: string | null;
  }>;
type microsoft_graph_timeOffItem = microsoft_graph_scheduleEntity &
  Partial<{
    timeOffReasonId: string | null;
  }>;
type microsoft_graph_teamworkTag = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string | null;
    memberCount: number | null;
    tagType: (microsoft_graph_teamworkTagType | {}) | Array<microsoft_graph_teamworkTagType | {}>;
    teamId: string | null;
    members: Array<microsoft_graph_teamworkTagMember>;
  }>;
type microsoft_graph_teamworkTagType = 'standard' | 'unknownFutureValue';
type microsoft_graph_teamworkTagMember = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    tenantId: string | null;
    userId: string | null;
  }>;
type microsoft_graph_teamsTemplate = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_printConnector = microsoft_graph_entity &
  Partial<{
    appVersion: string;
    displayName: string;
    fullyQualifiedDomainName: string;
    location: (microsoft_graph_printerLocation | {}) | Array<microsoft_graph_printerLocation | {}>;
    operatingSystem: string;
    registeredDateTime: string;
  }>;
type microsoft_graph_provisionedPlan = Partial<{
  capabilityStatus: string | null;
  provisioningStatus: string | null;
  service: string | null;
}>;
type microsoft_graph_signInActivity = Partial<{
  lastNonInteractiveSignInDateTime: string | null;
  lastNonInteractiveSignInRequestId: string | null;
  lastSignInDateTime: string | null;
  lastSignInRequestId: string | null;
  lastSuccessfulSignInDateTime: string | null;
  lastSuccessfulSignInRequestId: string | null;
}>;
type microsoft_graph_status = 'active' | 'updated' | 'deleted' | 'ignored' | 'unknownFutureValue';
type microsoft_graph_visualInfo = Partial<{
  attribution: (microsoft_graph_imageInfo | {}) | Array<microsoft_graph_imageInfo | {}>;
  backgroundColor: string | null;
  content: unknown;
  description: string | null;
  displayText: string;
}>;
type microsoft_graph_imageInfo = Partial<{
  addImageQuery: boolean | null;
  alternateText: string | null;
  alternativeText: string | null;
  iconUrl: string | null;
}>;
type microsoft_graph_agreementAcceptance = microsoft_graph_entity &
  Partial<{
    agreementFileId: string | null;
    agreementId: string | null;
    deviceDisplayName: string | null;
    deviceId: string | null;
    deviceOSType: string | null;
    deviceOSVersion: string | null;
    expirationDateTime: string | null;
    recordedDateTime: string | null;
    state:
      | (microsoft_graph_agreementAcceptanceState | {})
      | Array<microsoft_graph_agreementAcceptanceState | {}>;
    userDisplayName: string | null;
    userEmail: string | null;
    userId: string | null;
    userPrincipalName: string | null;
  }>;
type microsoft_graph_agreementAcceptanceState = 'accepted' | 'declined' | 'unknownFutureValue';
type microsoft_graph_authentication = microsoft_graph_entity &
  Partial<{
    emailMethods: Array<microsoft_graph_emailAuthenticationMethod>;
    fido2Methods: Array<microsoft_graph_fido2AuthenticationMethod>;
    methods: Array<microsoft_graph_authenticationMethod>;
    microsoftAuthenticatorMethods: Array<microsoft_graph_microsoftAuthenticatorAuthenticationMethod>;
    operations: Array<microsoft_graph_longRunningOperation>;
    passwordMethods: Array<microsoft_graph_passwordAuthenticationMethod>;
    phoneMethods: Array<microsoft_graph_phoneAuthenticationMethod>;
    platformCredentialMethods: Array<microsoft_graph_platformCredentialAuthenticationMethod>;
    softwareOathMethods: Array<microsoft_graph_softwareOathAuthenticationMethod>;
    temporaryAccessPassMethods: Array<microsoft_graph_temporaryAccessPassAuthenticationMethod>;
    windowsHelloForBusinessMethods: Array<microsoft_graph_windowsHelloForBusinessAuthenticationMethod>;
  }>;
type microsoft_graph_emailAuthenticationMethod = microsoft_graph_authenticationMethod &
  Partial<{
    emailAddress: string | null;
  }>;
type microsoft_graph_authenticationMethod = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_fido2AuthenticationMethod = microsoft_graph_authenticationMethod &
  Partial<{
    aaGuid: string | null;
    attestationCertificates: Array<string | null>;
    attestationLevel:
      | (microsoft_graph_attestationLevel | {})
      | Array<microsoft_graph_attestationLevel | {}>;
    createdDateTime: string | null;
    displayName: string | null;
    model: string | null;
  }>;
type microsoft_graph_attestationLevel = 'attested' | 'notAttested' | 'unknownFutureValue';
type microsoft_graph_microsoftAuthenticatorAuthenticationMethod =
  microsoft_graph_authenticationMethod &
    Partial<{
      createdDateTime: string | null;
      deviceTag: string | null;
      displayName: string | null;
      phoneAppVersion: string | null;
      device: (microsoft_graph_device | {}) | Array<microsoft_graph_device | {}>;
    }>;
type microsoft_graph_device = microsoft_graph_directoryObject &
  Partial<{
    accountEnabled: boolean | null;
    alternativeSecurityIds: Array<microsoft_graph_alternativeSecurityId>;
    approximateLastSignInDateTime: string | null;
    complianceExpirationDateTime: string | null;
    deviceCategory: string | null;
    deviceId: string | null;
    deviceMetadata: string | null;
    deviceOwnership: string | null;
    deviceVersion: number | null;
    displayName: string | null;
    enrollmentProfileName: string | null;
    enrollmentType: string | null;
    isCompliant: boolean | null;
    isManaged: boolean | null;
    isManagementRestricted: boolean | null;
    isRooted: boolean | null;
    managementType: string | null;
    manufacturer: string | null;
    mdmAppId: string | null;
    model: string | null;
    onPremisesLastSyncDateTime: string | null;
    onPremisesSecurityIdentifier: string | null;
    onPremisesSyncEnabled: boolean | null;
    operatingSystem: string | null;
    operatingSystemVersion: string | null;
    physicalIds: Array<string>;
    profileType: string | null;
    registrationDateTime: string | null;
    systemLabels: Array<string>;
    trustType: string | null;
    extensions: Array<microsoft_graph_extension>;
    memberOf: Array<microsoft_graph_directoryObject>;
    registeredOwners: Array<microsoft_graph_directoryObject>;
    registeredUsers: Array<microsoft_graph_directoryObject>;
    transitiveMemberOf: Array<microsoft_graph_directoryObject>;
  }>;
type microsoft_graph_alternativeSecurityId = Partial<{
  identityProvider: string | null;
  key: string | null;
  type: number | null;
}>;
type microsoft_graph_passwordAuthenticationMethod = microsoft_graph_authenticationMethod &
  Partial<{
    createdDateTime: string | null;
    password: string | null;
  }>;
type microsoft_graph_phoneAuthenticationMethod = microsoft_graph_authenticationMethod &
  Partial<{
    phoneNumber: string | null;
    phoneType:
      | (microsoft_graph_authenticationPhoneType | {})
      | Array<microsoft_graph_authenticationPhoneType | {}>;
    smsSignInState:
      | (microsoft_graph_authenticationMethodSignInState | {})
      | Array<microsoft_graph_authenticationMethodSignInState | {}>;
  }>;
type microsoft_graph_authenticationPhoneType =
  | 'mobile'
  | 'alternateMobile'
  | 'office'
  | 'unknownFutureValue';
type microsoft_graph_authenticationMethodSignInState =
  | 'notSupported'
  | 'notAllowedByPolicy'
  | 'notEnabled'
  | 'phoneNumberNotUnique'
  | 'ready'
  | 'notConfigured'
  | 'unknownFutureValue';
type microsoft_graph_platformCredentialAuthenticationMethod = microsoft_graph_authenticationMethod &
  Partial<{
    createdDateTime: string | null;
    displayName: string | null;
    keyStrength:
      | (microsoft_graph_authenticationMethodKeyStrength | {})
      | Array<microsoft_graph_authenticationMethodKeyStrength | {}>;
    platform:
      | (microsoft_graph_authenticationMethodPlatform | {})
      | Array<microsoft_graph_authenticationMethodPlatform | {}>;
    device: (microsoft_graph_device | {}) | Array<microsoft_graph_device | {}>;
  }>;
type microsoft_graph_authenticationMethodKeyStrength = 'normal' | 'weak' | 'unknown';
type microsoft_graph_authenticationMethodPlatform =
  | 'unknown'
  | 'windows'
  | 'macOS'
  | 'iOS'
  | 'android'
  | 'linux'
  | 'unknownFutureValue';
type microsoft_graph_softwareOathAuthenticationMethod = microsoft_graph_authenticationMethod &
  Partial<{
    secretKey: string | null;
  }>;
type microsoft_graph_temporaryAccessPassAuthenticationMethod =
  microsoft_graph_authenticationMethod &
    Partial<{
      createdDateTime: string | null;
      isUsable: boolean | null;
      isUsableOnce: boolean | null;
      lifetimeInMinutes: number | null;
      methodUsabilityReason: string | null;
      startDateTime: string | null;
      temporaryAccessPass: string | null;
    }>;
type microsoft_graph_windowsHelloForBusinessAuthenticationMethod =
  microsoft_graph_authenticationMethod &
    Partial<{
      createdDateTime: string | null;
      displayName: string | null;
      keyStrength:
        | (microsoft_graph_authenticationMethodKeyStrength | {})
        | Array<microsoft_graph_authenticationMethodKeyStrength | {}>;
      device: (microsoft_graph_device | {}) | Array<microsoft_graph_device | {}>;
    }>;
type microsoft_graph_calendarGroup = microsoft_graph_entity &
  Partial<{
    changeKey: string | null;
    classId: string | null;
    name: string | null;
    calendars: Array<microsoft_graph_calendar>;
  }>;
type microsoft_graph_chat = microsoft_graph_entity &
  Partial<{
    chatType: microsoft_graph_chatType;
    createdDateTime: string | null;
    isHiddenForAllMembers: boolean | null;
    lastUpdatedDateTime: string | null;
    onlineMeetingInfo:
      | (microsoft_graph_teamworkOnlineMeetingInfo | {})
      | Array<microsoft_graph_teamworkOnlineMeetingInfo | {}>;
    tenantId: string | null;
    topic: string | null;
    viewpoint: (microsoft_graph_chatViewpoint | {}) | Array<microsoft_graph_chatViewpoint | {}>;
    webUrl: string | null;
    installedApps: Array<microsoft_graph_teamsAppInstallation>;
    lastMessagePreview:
      | (microsoft_graph_chatMessageInfo | {})
      | Array<microsoft_graph_chatMessageInfo | {}>;
    members: Array<microsoft_graph_conversationMember>;
    messages: Array<microsoft_graph_chatMessage>;
    permissionGrants: Array<microsoft_graph_resourceSpecificPermissionGrant>;
    pinnedMessages: Array<microsoft_graph_pinnedChatMessageInfo>;
    tabs: Array<microsoft_graph_teamsTab>;
  }>;
type microsoft_graph_chatType = 'oneOnOne' | 'group' | 'meeting' | 'unknownFutureValue';
type microsoft_graph_teamworkOnlineMeetingInfo = Partial<{
  calendarEventId: string | null;
  joinWebUrl: string | null;
  organizer:
    | (microsoft_graph_teamworkUserIdentity | {})
    | Array<microsoft_graph_teamworkUserIdentity | {}>;
}>;
type microsoft_graph_teamworkUserIdentity = microsoft_graph_identity &
  Partial<{
    userIdentityType:
      | (microsoft_graph_teamworkUserIdentityType | {})
      | Array<microsoft_graph_teamworkUserIdentityType | {}>;
  }>;
type microsoft_graph_teamworkUserIdentityType =
  | 'aadUser'
  | 'onPremiseAadUser'
  | 'anonymousGuest'
  | 'federatedUser'
  | 'personalMicrosoftAccountUser'
  | 'skypeUser'
  | 'phoneUser'
  | 'unknownFutureValue'
  | 'emailUser';
type microsoft_graph_chatViewpoint = Partial<{
  isHidden: boolean | null;
  lastMessageReadDateTime: string | null;
}>;
type microsoft_graph_chatMessageInfo = microsoft_graph_entity &
  Partial<{
    body: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    createdDateTime: string | null;
    eventDetail:
      | (microsoft_graph_eventMessageDetail | {})
      | Array<microsoft_graph_eventMessageDetail | {}>;
    from:
      | (microsoft_graph_chatMessageFromIdentitySet | {})
      | Array<microsoft_graph_chatMessageFromIdentitySet | {}>;
    isDeleted: boolean | null;
    messageType: microsoft_graph_chatMessageType;
  }>;
type microsoft_graph_pinnedChatMessageInfo = microsoft_graph_entity &
  Partial<{
    message: (microsoft_graph_chatMessage | {}) | Array<microsoft_graph_chatMessage | {}>;
  }>;
type microsoft_graph_cloudClipboardRoot = microsoft_graph_entity &
  Partial<{
    items: Array<microsoft_graph_cloudClipboardItem>;
  }>;
type microsoft_graph_cloudClipboardItem = microsoft_graph_entity &
  Partial<{
    createdDateTime: string;
    expirationDateTime: string;
    lastModifiedDateTime: string | null;
    payloads: Array<microsoft_graph_cloudClipboardItemPayload>;
  }>;
type microsoft_graph_cloudClipboardItemPayload = Partial<{
  content: string;
  formatName: string;
}>;
type microsoft_graph_contact = microsoft_graph_outlookItem &
  Partial<{
    assistantName: string | null;
    birthday: string | null;
    businessAddress:
      | (microsoft_graph_physicalAddress | {})
      | Array<microsoft_graph_physicalAddress | {}>;
    businessHomePage: string | null;
    businessPhones: Array<string | null>;
    children: Array<string | null>;
    companyName: string | null;
    department: string | null;
    displayName: string | null;
    emailAddresses: Array<microsoft_graph_emailAddress>;
    fileAs: string | null;
    generation: string | null;
    givenName: string | null;
    homeAddress:
      | (microsoft_graph_physicalAddress | {})
      | Array<microsoft_graph_physicalAddress | {}>;
    homePhones: Array<string | null>;
    imAddresses: Array<string | null>;
    initials: string | null;
    jobTitle: string | null;
    manager: string | null;
    middleName: string | null;
    mobilePhone: string | null;
    nickName: string | null;
    officeLocation: string | null;
    otherAddress:
      | (microsoft_graph_physicalAddress | {})
      | Array<microsoft_graph_physicalAddress | {}>;
    parentFolderId: string | null;
    personalNotes: string | null;
    profession: string | null;
    spouseName: string | null;
    surname: string | null;
    title: string | null;
    yomiCompanyName: string | null;
    yomiGivenName: string | null;
    yomiSurname: string | null;
    extensions: Array<microsoft_graph_extension>;
    multiValueExtendedProperties: Array<microsoft_graph_multiValueLegacyExtendedProperty>;
    photo: (microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>;
    singleValueExtendedProperties: Array<microsoft_graph_singleValueLegacyExtendedProperty>;
  }>;
type microsoft_graph_deviceManagementTroubleshootingEvent = microsoft_graph_entity &
  Partial<{
    correlationId: string | null;
    eventDateTime: string;
  }>;
type microsoft_graph_employeeExperienceUser = microsoft_graph_entity &
  Partial<{
    learningCourseActivities: Array<microsoft_graph_learningCourseActivity>;
  }>;
type microsoft_graph_learningCourseActivity = microsoft_graph_entity &
  Partial<{
    completedDateTime: string | null;
    completionPercentage: number | null;
    externalcourseActivityId: string | null;
    learnerUserId: string;
    learningContentId: string;
    learningProviderId: string | null;
    status: (microsoft_graph_courseStatus | {}) | Array<microsoft_graph_courseStatus | {}>;
  }>;
type microsoft_graph_courseStatus =
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'unknownFutureValue';
type microsoft_graph_inferenceClassification = microsoft_graph_entity &
  Partial<{
    overrides: Array<microsoft_graph_inferenceClassificationOverride>;
  }>;
type microsoft_graph_inferenceClassificationOverride = microsoft_graph_entity &
  Partial<{
    classifyAs:
      | (microsoft_graph_inferenceClassificationType | {})
      | Array<microsoft_graph_inferenceClassificationType | {}>;
    senderEmailAddress:
      | (microsoft_graph_emailAddress | {})
      | Array<microsoft_graph_emailAddress | {}>;
  }>;
type microsoft_graph_inferenceClassificationType = 'focused' | 'other';
type microsoft_graph_itemInsights = microsoft_graph_officeGraphInsights & Partial<{}>;
type microsoft_graph_officeGraphInsights = microsoft_graph_entity &
  Partial<{
    shared: Array<microsoft_graph_sharedInsight>;
    trending: Array<microsoft_graph_trending>;
    used: Array<microsoft_graph_usedInsight>;
  }>;
type microsoft_graph_sharedInsight = microsoft_graph_entity &
  Partial<{
    lastShared: (microsoft_graph_sharingDetail | {}) | Array<microsoft_graph_sharingDetail | {}>;
    resourceReference:
      | (microsoft_graph_resourceReference | {})
      | Array<microsoft_graph_resourceReference | {}>;
    resourceVisualization:
      | (microsoft_graph_resourceVisualization | {})
      | Array<microsoft_graph_resourceVisualization | {}>;
    sharingHistory: Array<microsoft_graph_sharingDetail>;
    lastSharedMethod: (microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>;
    resource: (microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>;
  }>;
type microsoft_graph_sharingDetail = Partial<{
  sharedBy: (microsoft_graph_insightIdentity | {}) | Array<microsoft_graph_insightIdentity | {}>;
  sharedDateTime: string | null;
  sharingReference:
    | (microsoft_graph_resourceReference | {})
    | Array<microsoft_graph_resourceReference | {}>;
  sharingSubject: string | null;
  sharingType: string | null;
}>;
type microsoft_graph_insightIdentity = Partial<{
  address: string | null;
  displayName: string | null;
  id: string | null;
}>;
type microsoft_graph_resourceReference = Partial<{
  id: string | null;
  type: string | null;
  webUrl: string | null;
}>;
type microsoft_graph_resourceVisualization = Partial<{
  containerDisplayName: string | null;
  containerType: string | null;
  containerWebUrl: string | null;
  mediaType: string | null;
  previewImageUrl: string | null;
  previewText: string | null;
  title: string | null;
  type: string | null;
}>;
type microsoft_graph_trending = microsoft_graph_entity &
  Partial<{
    lastModifiedDateTime: string | null;
    resourceReference:
      | (microsoft_graph_resourceReference | {})
      | Array<microsoft_graph_resourceReference | {}>;
    resourceVisualization:
      | (microsoft_graph_resourceVisualization | {})
      | Array<microsoft_graph_resourceVisualization | {}>;
    weight: (number | null) | (string | null) | ReferenceNumeric;
    resource: (microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>;
  }>;
type microsoft_graph_usedInsight = microsoft_graph_entity &
  Partial<{
    lastUsed: (microsoft_graph_usageDetails | {}) | Array<microsoft_graph_usageDetails | {}>;
    resourceReference:
      | (microsoft_graph_resourceReference | {})
      | Array<microsoft_graph_resourceReference | {}>;
    resourceVisualization:
      | (microsoft_graph_resourceVisualization | {})
      | Array<microsoft_graph_resourceVisualization | {}>;
    resource: (microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>;
  }>;
type microsoft_graph_usageDetails = Partial<{
  lastAccessedDateTime: string | null;
  lastModifiedDateTime: string | null;
}>;
type microsoft_graph_licenseDetails = microsoft_graph_entity &
  Partial<{
    servicePlans: Array<microsoft_graph_servicePlanInfo>;
    skuId: string | null;
    skuPartNumber: string | null;
  }>;
type microsoft_graph_servicePlanInfo = Partial<{
  appliesTo: string | null;
  provisioningStatus: string | null;
  servicePlanId: string | null;
  servicePlanName: string | null;
}>;
type microsoft_graph_messageRule = microsoft_graph_entity &
  Partial<{
    actions:
      | (microsoft_graph_messageRuleActions | {})
      | Array<microsoft_graph_messageRuleActions | {}>;
    conditions:
      | (microsoft_graph_messageRulePredicates | {})
      | Array<microsoft_graph_messageRulePredicates | {}>;
    displayName: string | null;
    exceptions:
      | (microsoft_graph_messageRulePredicates | {})
      | Array<microsoft_graph_messageRulePredicates | {}>;
    hasError: boolean | null;
    isEnabled: boolean | null;
    isReadOnly: boolean | null;
    sequence: number | null;
  }>;
type microsoft_graph_messageRuleActions = Partial<{
  assignCategories: Array<string | null>;
  copyToFolder: string | null;
  delete: boolean | null;
  forwardAsAttachmentTo: Array<microsoft_graph_recipient>;
  forwardTo: Array<microsoft_graph_recipient>;
  markAsRead: boolean | null;
  markImportance: (microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>;
  moveToFolder: string | null;
  permanentDelete: boolean | null;
  redirectTo: Array<microsoft_graph_recipient>;
  stopProcessingRules: boolean | null;
}>;
type microsoft_graph_messageRulePredicates = Partial<{
  bodyContains: Array<string | null>;
  bodyOrSubjectContains: Array<string | null>;
  categories: Array<string | null>;
  fromAddresses: Array<microsoft_graph_recipient>;
  hasAttachments: boolean | null;
  headerContains: Array<string | null>;
  importance: (microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>;
  isApprovalRequest: boolean | null;
  isAutomaticForward: boolean | null;
  isAutomaticReply: boolean | null;
  isEncrypted: boolean | null;
  isMeetingRequest: boolean | null;
  isMeetingResponse: boolean | null;
  isNonDeliveryReport: boolean | null;
  isPermissionControlled: boolean | null;
  isReadReceipt: boolean | null;
  isSigned: boolean | null;
  isVoicemail: boolean | null;
  messageActionFlag:
    | (microsoft_graph_messageActionFlag | {})
    | Array<microsoft_graph_messageActionFlag | {}>;
  notSentToMe: boolean | null;
  recipientContains: Array<string | null>;
  senderContains: Array<string | null>;
  sensitivity: (microsoft_graph_sensitivity | {}) | Array<microsoft_graph_sensitivity | {}>;
  sentCcMe: boolean | null;
  sentOnlyToMe: boolean | null;
  sentToAddresses: Array<microsoft_graph_recipient>;
  sentToMe: boolean | null;
  sentToOrCcMe: boolean | null;
  subjectContains: Array<string | null>;
  withinSizeRange: (microsoft_graph_sizeRange | {}) | Array<microsoft_graph_sizeRange | {}>;
}>;
type microsoft_graph_messageActionFlag =
  | 'any'
  | 'call'
  | 'doNotForward'
  | 'followUp'
  | 'fyi'
  | 'forward'
  | 'noResponseNecessary'
  | 'read'
  | 'reply'
  | 'replyToAll'
  | 'review';
type microsoft_graph_sizeRange = Partial<{
  maximumSize: number | null;
  minimumSize: number | null;
}>;
type microsoft_graph_message = microsoft_graph_outlookItem &
  Partial<{
    bccRecipients: Array<microsoft_graph_recipient>;
    body: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    bodyPreview: string | null;
    ccRecipients: Array<microsoft_graph_recipient>;
    conversationId: string | null;
    conversationIndex: string | null;
    flag: (microsoft_graph_followupFlag | {}) | Array<microsoft_graph_followupFlag | {}>;
    from: (microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>;
    hasAttachments: boolean | null;
    importance: (microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>;
    inferenceClassification:
      | (microsoft_graph_inferenceClassificationType | {})
      | Array<microsoft_graph_inferenceClassificationType | {}>;
    internetMessageHeaders: Array<microsoft_graph_internetMessageHeader>;
    internetMessageId: string | null;
    isDeliveryReceiptRequested: boolean | null;
    isDraft: boolean | null;
    isRead: boolean | null;
    isReadReceiptRequested: boolean | null;
    parentFolderId: string | null;
    receivedDateTime: string | null;
    replyTo: Array<microsoft_graph_recipient>;
    sender: (microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>;
    sentDateTime: string | null;
    subject: string | null;
    toRecipients: Array<microsoft_graph_recipient>;
    uniqueBody: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    webLink: string | null;
    attachments: Array<microsoft_graph_attachment>;
    extensions: Array<microsoft_graph_extension>;
    multiValueExtendedProperties: Array<microsoft_graph_multiValueLegacyExtendedProperty>;
    singleValueExtendedProperties: Array<microsoft_graph_singleValueLegacyExtendedProperty>;
  }>;
type microsoft_graph_followupFlag = Partial<{
  completedDateTime:
    | (microsoft_graph_dateTimeTimeZone | {})
    | Array<microsoft_graph_dateTimeTimeZone | {}>;
  dueDateTime:
    | (microsoft_graph_dateTimeTimeZone | {})
    | Array<microsoft_graph_dateTimeTimeZone | {}>;
  flagStatus:
    | (microsoft_graph_followupFlagStatus | {})
    | Array<microsoft_graph_followupFlagStatus | {}>;
  startDateTime:
    | (microsoft_graph_dateTimeTimeZone | {})
    | Array<microsoft_graph_dateTimeTimeZone | {}>;
}>;
type microsoft_graph_followupFlagStatus = 'notFlagged' | 'complete' | 'flagged';
type microsoft_graph_internetMessageHeader = Partial<{
  name: string | null;
  value: string | null;
}>;
type microsoft_graph_managedAppRegistration = microsoft_graph_entity &
  Partial<{
    appIdentifier:
      | (microsoft_graph_mobileAppIdentifier | {})
      | Array<microsoft_graph_mobileAppIdentifier | {}>;
    applicationVersion: string | null;
    createdDateTime: string;
    deviceName: string | null;
    deviceTag: string | null;
    deviceType: string | null;
    flaggedReasons: Array<microsoft_graph_managedAppFlaggedReason>;
    lastSyncDateTime: string;
    managementSdkVersion: string | null;
    platformVersion: string | null;
    userId: string | null;
    version: string | null;
    appliedPolicies: Array<microsoft_graph_managedAppPolicy>;
    intendedPolicies: Array<microsoft_graph_managedAppPolicy>;
    operations: Array<microsoft_graph_managedAppOperation>;
  }>;
type microsoft_graph_mobileAppIdentifier = Partial<{}>;
type microsoft_graph_managedAppFlaggedReason = 'none' | 'rootedDevice';
type microsoft_graph_managedAppPolicy = microsoft_graph_entity &
  Partial<{
    createdDateTime: string;
    description: string | null;
    displayName: string;
    lastModifiedDateTime: string;
    version: string | null;
  }>;
type microsoft_graph_managedAppOperation = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    lastModifiedDateTime: string;
    state: string | null;
    version: string | null;
  }>;
type microsoft_graph_complianceState =
  | 'unknown'
  | 'compliant'
  | 'noncompliant'
  | 'conflict'
  | 'error'
  | 'inGracePeriod'
  | 'configManager';
type microsoft_graph_configurationManagerClientEnabledFeatures = Partial<{
  compliancePolicy: boolean;
  deviceConfiguration: boolean;
  inventory: boolean;
  modernApps: boolean;
  resourceAccess: boolean;
  windowsUpdateForBusiness: boolean;
}>;
type microsoft_graph_deviceActionResult = Partial<{
  actionName: string | null;
  actionState: microsoft_graph_actionState;
  lastUpdatedDateTime: string;
  startDateTime: string;
}>;
type microsoft_graph_actionState =
  | 'none'
  | 'pending'
  | 'canceled'
  | 'active'
  | 'done'
  | 'failed'
  | 'notSupported';
type microsoft_graph_deviceEnrollmentType =
  | 'unknown'
  | 'userEnrollment'
  | 'deviceEnrollmentManager'
  | 'appleBulkWithUser'
  | 'appleBulkWithoutUser'
  | 'windowsAzureADJoin'
  | 'windowsBulkUserless'
  | 'windowsAutoEnrollment'
  | 'windowsBulkAzureDomainJoin'
  | 'windowsCoManagement'
  | 'windowsAzureADJoinUsingDeviceAuth'
  | 'appleUserEnrollment'
  | 'appleUserEnrollmentWithServiceAccount';
type microsoft_graph_deviceHealthAttestationState = Partial<{
  attestationIdentityKey: string | null;
  bitLockerStatus: string | null;
  bootAppSecurityVersion: string | null;
  bootDebugging: string | null;
  bootManagerSecurityVersion: string | null;
  bootManagerVersion: string | null;
  bootRevisionListInfo: string | null;
  codeIntegrity: string | null;
  codeIntegrityCheckVersion: string | null;
  codeIntegrityPolicy: string | null;
  contentNamespaceUrl: string | null;
  contentVersion: string | null;
  dataExcutionPolicy: string | null;
  deviceHealthAttestationStatus: string | null;
  earlyLaunchAntiMalwareDriverProtection: string | null;
  healthAttestationSupportedStatus: string | null;
  healthStatusMismatchInfo: string | null;
  issuedDateTime: string;
  lastUpdateDateTime: string | null;
  operatingSystemKernelDebugging: string | null;
  operatingSystemRevListInfo: string | null;
  pcr0: string | null;
  pcrHashAlgorithm: string | null;
  resetCount: number;
  restartCount: number;
  safeMode: string | null;
  secureBoot: string | null;
  secureBootConfigurationPolicyFingerPrint: string | null;
  testSigning: string | null;
  tpmVersion: string | null;
  virtualSecureMode: string | null;
  windowsPE: string | null;
}>;
type microsoft_graph_deviceRegistrationState =
  | 'notRegistered'
  | 'registered'
  | 'revoked'
  | 'keyConflict'
  | 'approvalPending'
  | 'certificateReset'
  | 'notRegisteredPendingEnrollment'
  | 'unknown';
type microsoft_graph_deviceManagementExchangeAccessState =
  | 'none'
  | 'unknown'
  | 'allowed'
  | 'blocked'
  | 'quarantined';
type microsoft_graph_deviceManagementExchangeAccessStateReason =
  | 'none'
  | 'unknown'
  | 'exchangeGlobalRule'
  | 'exchangeIndividualRule'
  | 'exchangeDeviceRule'
  | 'exchangeUpgrade'
  | 'exchangeMailboxPolicy'
  | 'other'
  | 'compliant'
  | 'notCompliant'
  | 'notEnrolled'
  | 'unknownLocation'
  | 'mfaRequired'
  | 'azureADBlockDueToAccessPolicy'
  | 'compromisedPassword'
  | 'deviceNotKnownWithManagedApp';
type microsoft_graph_managedDeviceOwnerType =
  | 'unknown'
  | 'company'
  | 'personal'
  | 'unknownFutureValue';
type microsoft_graph_managementAgentType =
  | 'eas'
  | 'mdm'
  | 'easMdm'
  | 'intuneClient'
  | 'easIntuneClient'
  | 'configurationManagerClient'
  | 'configurationManagerClientMdm'
  | 'configurationManagerClientMdmEas'
  | 'unknown'
  | 'jamf'
  | 'googleCloudDevicePolicyController'
  | 'microsoft365ManagedMdm'
  | 'msSense';
type microsoft_graph_managedDevicePartnerReportedHealthState =
  | 'unknown'
  | 'activated'
  | 'deactivated'
  | 'secured'
  | 'lowSeverity'
  | 'mediumSeverity'
  | 'highSeverity'
  | 'unresponsive'
  | 'compromised'
  | 'misconfigured';
type microsoft_graph_deviceCategory = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string | null;
  }>;
type microsoft_graph_deviceCompliancePolicyState = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    platformType: microsoft_graph_policyPlatformType;
    settingCount: number;
    settingStates: Array<microsoft_graph_deviceCompliancePolicySettingState>;
    state: microsoft_graph_complianceStatus;
    version: number;
  }>;
type microsoft_graph_policyPlatformType =
  | 'android'
  | 'androidForWork'
  | 'iOS'
  | 'macOS'
  | 'windowsPhone81'
  | 'windows81AndLater'
  | 'windows10AndLater'
  | 'all';
type microsoft_graph_deviceCompliancePolicySettingState = Partial<{
  currentValue: string | null;
  errorCode: number;
  errorDescription: string | null;
  instanceDisplayName: string | null;
  setting: string | null;
  settingName: string | null;
  sources: Array<microsoft_graph_settingSource>;
  state: microsoft_graph_complianceStatus;
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  userPrincipalName: string | null;
}>;
type microsoft_graph_settingSource = Partial<{
  displayName: string | null;
  id: string | null;
  sourceType: microsoft_graph_settingSourceType;
}>;
type microsoft_graph_settingSourceType = 'deviceConfiguration' | 'deviceIntent';
type microsoft_graph_complianceStatus =
  | 'unknown'
  | 'notApplicable'
  | 'compliant'
  | 'remediated'
  | 'nonCompliant'
  | 'error'
  | 'conflict'
  | 'notAssigned';
type microsoft_graph_deviceConfigurationState = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    platformType: microsoft_graph_policyPlatformType;
    settingCount: number;
    settingStates: Array<microsoft_graph_deviceConfigurationSettingState>;
    state: microsoft_graph_complianceStatus;
    version: number;
  }>;
type microsoft_graph_deviceConfigurationSettingState = Partial<{
  currentValue: string | null;
  errorCode: number;
  errorDescription: string | null;
  instanceDisplayName: string | null;
  setting: string | null;
  settingName: string | null;
  sources: Array<microsoft_graph_settingSource>;
  state: microsoft_graph_complianceStatus;
  userEmail: string | null;
  userId: string | null;
  userName: string | null;
  userPrincipalName: string | null;
}>;
type microsoft_graph_deviceLogCollectionResponse = microsoft_graph_entity &
  Partial<{
    enrolledByUser: string | null;
    expirationDateTimeUTC: string | null;
    initiatedByUserPrincipalName: string | null;
    managedDeviceId: string;
    receivedDateTimeUTC: string | null;
    requestedDateTimeUTC: string | null;
    sizeInKB: (number | null) | (string | null) | ReferenceNumeric;
    status: microsoft_graph_appLogUploadState;
  }>;
type microsoft_graph_appLogUploadState = 'pending' | 'completed' | 'failed' | 'unknownFutureValue';
type microsoft_graph_windowsProtectionState = microsoft_graph_entity &
  Partial<{
    antiMalwareVersion: string | null;
    deviceState:
      | (microsoft_graph_windowsDeviceHealthState | {})
      | Array<microsoft_graph_windowsDeviceHealthState | {}>;
    engineVersion: string | null;
    fullScanOverdue: boolean | null;
    fullScanRequired: boolean | null;
    isVirtualMachine: boolean | null;
    lastFullScanDateTime: string | null;
    lastFullScanSignatureVersion: string | null;
    lastQuickScanDateTime: string | null;
    lastQuickScanSignatureVersion: string | null;
    lastReportedDateTime: string | null;
    malwareProtectionEnabled: boolean | null;
    networkInspectionSystemEnabled: boolean | null;
    productStatus:
      | (microsoft_graph_windowsDefenderProductStatus | {})
      | Array<microsoft_graph_windowsDefenderProductStatus | {}>;
    quickScanOverdue: boolean | null;
    realTimeProtectionEnabled: boolean | null;
    rebootRequired: boolean | null;
    signatureUpdateOverdue: boolean | null;
    signatureVersion: string | null;
    tamperProtectionEnabled: boolean | null;
    detectedMalwareState: Array<microsoft_graph_windowsDeviceMalwareState>;
  }>;
type microsoft_graph_windowsDeviceHealthState =
  | 'clean'
  | 'fullScanPending'
  | 'rebootPending'
  | 'manualStepsPending'
  | 'offlineScanPending'
  | 'critical';
type microsoft_graph_windowsDefenderProductStatus =
  | 'noStatus'
  | 'serviceNotRunning'
  | 'serviceStartedWithoutMalwareProtection'
  | 'pendingFullScanDueToThreatAction'
  | 'pendingRebootDueToThreatAction'
  | 'pendingManualStepsDueToThreatAction'
  | 'avSignaturesOutOfDate'
  | 'asSignaturesOutOfDate'
  | 'noQuickScanHappenedForSpecifiedPeriod'
  | 'noFullScanHappenedForSpecifiedPeriod'
  | 'systemInitiatedScanInProgress'
  | 'systemInitiatedCleanInProgress'
  | 'samplesPendingSubmission'
  | 'productRunningInEvaluationMode'
  | 'productRunningInNonGenuineMode'
  | 'productExpired'
  | 'offlineScanRequired'
  | 'serviceShutdownAsPartOfSystemShutdown'
  | 'threatRemediationFailedCritically'
  | 'threatRemediationFailedNonCritically'
  | 'noStatusFlagsSet'
  | 'platformOutOfDate'
  | 'platformUpdateInProgress'
  | 'platformAboutToBeOutdated'
  | 'signatureOrPlatformEndOfLifeIsPastOrIsImpending'
  | 'windowsSModeSignaturesInUseOnNonWin10SInstall';
type microsoft_graph_windowsDeviceMalwareState = microsoft_graph_entity &
  Partial<{
    additionalInformationUrl: string | null;
    category:
      | (microsoft_graph_windowsMalwareCategory | {})
      | Array<microsoft_graph_windowsMalwareCategory | {}>;
    detectionCount: number | null;
    displayName: string | null;
    executionState:
      | (microsoft_graph_windowsMalwareExecutionState | {})
      | Array<microsoft_graph_windowsMalwareExecutionState | {}>;
    initialDetectionDateTime: string | null;
    lastStateChangeDateTime: string | null;
    severity:
      | (microsoft_graph_windowsMalwareSeverity | {})
      | Array<microsoft_graph_windowsMalwareSeverity | {}>;
    state:
      | (microsoft_graph_windowsMalwareState | {})
      | Array<microsoft_graph_windowsMalwareState | {}>;
    threatState:
      | (microsoft_graph_windowsMalwareThreatState | {})
      | Array<microsoft_graph_windowsMalwareThreatState | {}>;
  }>;
type microsoft_graph_windowsMalwareCategory =
  | 'invalid'
  | 'adware'
  | 'spyware'
  | 'passwordStealer'
  | 'trojanDownloader'
  | 'worm'
  | 'backdoor'
  | 'remoteAccessTrojan'
  | 'trojan'
  | 'emailFlooder'
  | 'keylogger'
  | 'dialer'
  | 'monitoringSoftware'
  | 'browserModifier'
  | 'cookie'
  | 'browserPlugin'
  | 'aolExploit'
  | 'nuker'
  | 'securityDisabler'
  | 'jokeProgram'
  | 'hostileActiveXControl'
  | 'softwareBundler'
  | 'stealthNotifier'
  | 'settingsModifier'
  | 'toolBar'
  | 'remoteControlSoftware'
  | 'trojanFtp'
  | 'potentialUnwantedSoftware'
  | 'icqExploit'
  | 'trojanTelnet'
  | 'exploit'
  | 'filesharingProgram'
  | 'malwareCreationTool'
  | 'remote_Control_Software'
  | 'tool'
  | 'trojanDenialOfService'
  | 'trojanDropper'
  | 'trojanMassMailer'
  | 'trojanMonitoringSoftware'
  | 'trojanProxyServer'
  | 'virus'
  | 'known'
  | 'unknown'
  | 'spp'
  | 'behavior'
  | 'vulnerability'
  | 'policy'
  | 'enterpriseUnwantedSoftware'
  | 'ransom'
  | 'hipsRule';
type microsoft_graph_windowsMalwareExecutionState =
  | 'unknown'
  | 'blocked'
  | 'allowed'
  | 'running'
  | 'notRunning';
type microsoft_graph_windowsMalwareSeverity = 'unknown' | 'low' | 'moderate' | 'high' | 'severe';
type microsoft_graph_windowsMalwareState =
  | 'unknown'
  | 'detected'
  | 'cleaned'
  | 'quarantined'
  | 'removed'
  | 'allowed'
  | 'blocked'
  | 'cleanFailed'
  | 'quarantineFailed'
  | 'removeFailed'
  | 'allowFailed'
  | 'abandoned'
  | 'blockFailed';
type microsoft_graph_windowsMalwareThreatState =
  | 'active'
  | 'actionFailed'
  | 'manualStepsRequired'
  | 'fullScanRequired'
  | 'rebootRequired'
  | 'remediatedWithNonCriticalFailures'
  | 'quarantined'
  | 'removed'
  | 'cleaned'
  | 'allowed'
  | 'noStatusCleared';
type microsoft_graph_oAuth2PermissionGrant = microsoft_graph_entity &
  Partial<{
    clientId: string;
    consentType: string | null;
    principalId: string | null;
    resourceId: string;
    scope: string | null;
  }>;
type microsoft_graph_onlineMeeting = microsoft_graph_onlineMeetingBase &
  Partial<{
    attendeeReport: string | null;
    broadcastSettings:
      | (microsoft_graph_broadcastMeetingSettings | {})
      | Array<microsoft_graph_broadcastMeetingSettings | {}>;
    creationDateTime: string | null;
    endDateTime: string | null;
    externalId: string | null;
    isBroadcast: boolean | null;
    meetingTemplateId: string | null;
    participants:
      | (microsoft_graph_meetingParticipants | {})
      | Array<microsoft_graph_meetingParticipants | {}>;
    startDateTime: string | null;
    recordings: Array<microsoft_graph_callRecording>;
    transcripts: Array<microsoft_graph_callTranscript>;
  }>;
type microsoft_graph_onlineMeetingBase = microsoft_graph_entity &
  Partial<{
    allowAttendeeToEnableCamera: boolean | null;
    allowAttendeeToEnableMic: boolean | null;
    allowBreakoutRooms: boolean | null;
    allowedLobbyAdmitters:
      | (microsoft_graph_allowedLobbyAdmitterRoles | {})
      | Array<microsoft_graph_allowedLobbyAdmitterRoles | {}>;
    allowedPresenters:
      | (microsoft_graph_onlineMeetingPresenters | {})
      | Array<microsoft_graph_onlineMeetingPresenters | {}>;
    allowLiveShare:
      | (microsoft_graph_meetingLiveShareOptions | {})
      | Array<microsoft_graph_meetingLiveShareOptions | {}>;
    allowMeetingChat:
      | (microsoft_graph_meetingChatMode | {})
      | Array<microsoft_graph_meetingChatMode | {}>;
    allowParticipantsToChangeName: boolean | null;
    allowPowerPointSharing: boolean | null;
    allowRecording: boolean | null;
    allowTeamworkReactions: boolean | null;
    allowTranscription: boolean | null;
    allowWhiteboard: boolean | null;
    audioConferencing:
      | (microsoft_graph_audioConferencing | {})
      | Array<microsoft_graph_audioConferencing | {}>;
    chatInfo: (microsoft_graph_chatInfo | {}) | Array<microsoft_graph_chatInfo | {}>;
    chatRestrictions:
      | (microsoft_graph_chatRestrictions | {})
      | Array<microsoft_graph_chatRestrictions | {}>;
    isEntryExitAnnounced: boolean | null;
    joinInformation: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    joinMeetingIdSettings:
      | (microsoft_graph_joinMeetingIdSettings | {})
      | Array<microsoft_graph_joinMeetingIdSettings | {}>;
    joinWebUrl: string | null;
    lobbyBypassSettings:
      | (microsoft_graph_lobbyBypassSettings | {})
      | Array<microsoft_graph_lobbyBypassSettings | {}>;
    recordAutomatically: boolean | null;
    shareMeetingChatHistoryDefault:
      | (microsoft_graph_meetingChatHistoryDefaultMode | {})
      | Array<microsoft_graph_meetingChatHistoryDefaultMode | {}>;
    subject: string | null;
    videoTeleconferenceId: string | null;
    watermarkProtection:
      | (microsoft_graph_watermarkProtectionValues | {})
      | Array<microsoft_graph_watermarkProtectionValues | {}>;
    attendanceReports: Array<microsoft_graph_meetingAttendanceReport>;
  }>;
type microsoft_graph_allowedLobbyAdmitterRoles =
  | 'organizerAndCoOrganizersAndPresenters'
  | 'organizerAndCoOrganizers'
  | 'unknownFutureValue';
type microsoft_graph_onlineMeetingPresenters =
  | 'everyone'
  | 'organization'
  | 'roleIsPresenter'
  | 'organizer'
  | 'unknownFutureValue';
type microsoft_graph_meetingLiveShareOptions = 'enabled' | 'disabled' | 'unknownFutureValue';
type microsoft_graph_meetingChatMode = 'enabled' | 'disabled' | 'limited' | 'unknownFutureValue';
type microsoft_graph_audioConferencing = Partial<{
  conferenceId: string | null;
  dialinUrl: string | null;
  tollFreeNumber: string | null;
  tollFreeNumbers: Array<string | null>;
  tollNumber: string | null;
  tollNumbers: Array<string | null>;
}>;
type microsoft_graph_chatInfo = Partial<{
  messageId: string | null;
  replyChainMessageId: string | null;
  threadId: string | null;
}>;
type microsoft_graph_chatRestrictions = Partial<{
  allowTextOnly: boolean | null;
}>;
type microsoft_graph_joinMeetingIdSettings = Partial<{
  isPasscodeRequired: boolean | null;
  joinMeetingId: string | null;
  passcode: string | null;
}>;
type microsoft_graph_lobbyBypassSettings = Partial<{
  isDialInBypassEnabled: boolean | null;
  scope: (microsoft_graph_lobbyBypassScope | {}) | Array<microsoft_graph_lobbyBypassScope | {}>;
}>;
type microsoft_graph_lobbyBypassScope =
  | 'organizer'
  | 'organization'
  | 'organizationAndFederated'
  | 'everyone'
  | 'unknownFutureValue'
  | 'invited'
  | 'organizationExcludingGuests';
type microsoft_graph_meetingChatHistoryDefaultMode = 'none' | 'all' | 'unknownFutureValue';
type microsoft_graph_watermarkProtectionValues = Partial<{
  isEnabledForContentSharing: boolean | null;
  isEnabledForVideo: boolean | null;
}>;
type microsoft_graph_meetingAttendanceReport = microsoft_graph_entity &
  Partial<{
    externalEventInformation: Array<microsoft_graph_virtualEventExternalInformation>;
    meetingEndDateTime: string | null;
    meetingStartDateTime: string | null;
    totalParticipantCount: number | null;
    attendanceRecords: Array<microsoft_graph_attendanceRecord>;
  }>;
type microsoft_graph_virtualEventExternalInformation = Partial<{
  applicationId: string | null;
  externalEventId: string | null;
}>;
type microsoft_graph_attendanceRecord = microsoft_graph_entity &
  Partial<{
    attendanceIntervals: Array<microsoft_graph_attendanceInterval>;
    emailAddress: string | null;
    externalRegistrationInformation:
      | (microsoft_graph_virtualEventExternalRegistrationInformation | {})
      | Array<microsoft_graph_virtualEventExternalRegistrationInformation | {}>;
    identity: (microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>;
    registrationId: string | null;
    role: string | null;
    totalAttendanceInSeconds: number | null;
  }>;
type microsoft_graph_attendanceInterval = Partial<{
  durationInSeconds: number | null;
  joinDateTime: string | null;
  leaveDateTime: string | null;
}>;
type microsoft_graph_virtualEventExternalRegistrationInformation = Partial<{
  referrer: string | null;
  registrationId: string | null;
}>;
type microsoft_graph_broadcastMeetingSettings = Partial<{
  allowedAudience:
    | (microsoft_graph_broadcastMeetingAudience | {})
    | Array<microsoft_graph_broadcastMeetingAudience | {}>;
  captions:
    | (microsoft_graph_broadcastMeetingCaptionSettings | {})
    | Array<microsoft_graph_broadcastMeetingCaptionSettings | {}>;
  isAttendeeReportEnabled: boolean | null;
  isQuestionAndAnswerEnabled: boolean | null;
  isRecordingEnabled: boolean | null;
  isVideoOnDemandEnabled: boolean | null;
}>;
type microsoft_graph_broadcastMeetingAudience =
  | 'roleIsAttendee'
  | 'organization'
  | 'everyone'
  | 'unknownFutureValue';
type microsoft_graph_broadcastMeetingCaptionSettings = Partial<{
  isCaptionEnabled: boolean | null;
  spokenLanguage: string | null;
  translationLanguages: Array<string | null>;
}>;
type microsoft_graph_meetingParticipants = Partial<{
  attendees: Array<microsoft_graph_meetingParticipantInfo>;
  organizer:
    | (microsoft_graph_meetingParticipantInfo | {})
    | Array<microsoft_graph_meetingParticipantInfo | {}>;
}>;
type microsoft_graph_meetingParticipantInfo = Partial<{
  identity: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  role: (microsoft_graph_onlineMeetingRole | {}) | Array<microsoft_graph_onlineMeetingRole | {}>;
  upn: string | null;
}>;
type microsoft_graph_onlineMeetingRole =
  | 'attendee'
  | 'presenter'
  | 'unknownFutureValue'
  | 'producer'
  | 'coorganizer';
type microsoft_graph_callRecording = microsoft_graph_entity &
  Partial<{
    callId: string | null;
    content: string | null;
    contentCorrelationId: string | null;
    createdDateTime: string | null;
    endDateTime: string | null;
    meetingId: string | null;
    meetingOrganizer: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    recordingContentUrl: string | null;
  }>;
type microsoft_graph_callTranscript = microsoft_graph_entity &
  Partial<{
    callId: string | null;
    content: string | null;
    contentCorrelationId: string | null;
    createdDateTime: string | null;
    endDateTime: string | null;
    meetingId: string | null;
    meetingOrganizer: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    metadataContent: string | null;
    transcriptContentUrl: string | null;
  }>;
type microsoft_graph_outlookUser = microsoft_graph_entity &
  Partial<{
    masterCategories: Array<microsoft_graph_outlookCategory>;
  }>;
type microsoft_graph_outlookCategory = microsoft_graph_entity &
  Partial<{
    color: (microsoft_graph_categoryColor | {}) | Array<microsoft_graph_categoryColor | {}>;
    displayName: string | null;
  }>;
type microsoft_graph_categoryColor =
  | 'none'
  | 'preset0'
  | 'preset1'
  | 'preset2'
  | 'preset3'
  | 'preset4'
  | 'preset5'
  | 'preset6'
  | 'preset7'
  | 'preset8'
  | 'preset9'
  | 'preset10'
  | 'preset11'
  | 'preset12'
  | 'preset13'
  | 'preset14'
  | 'preset15'
  | 'preset16'
  | 'preset17'
  | 'preset18'
  | 'preset19'
  | 'preset20'
  | 'preset21'
  | 'preset22'
  | 'preset23'
  | 'preset24';
type microsoft_graph_person = microsoft_graph_entity &
  Partial<{
    birthday: string | null;
    companyName: string | null;
    department: string | null;
    displayName: string | null;
    givenName: string | null;
    imAddress: string | null;
    isFavorite: boolean | null;
    jobTitle: string | null;
    officeLocation: string | null;
    personNotes: string | null;
    personType: (microsoft_graph_personType | {}) | Array<microsoft_graph_personType | {}>;
    phones: Array<microsoft_graph_phone>;
    postalAddresses: Array<microsoft_graph_location>;
    profession: string | null;
    scoredEmailAddresses: Array<microsoft_graph_scoredEmailAddress>;
    surname: string | null;
    userPrincipalName: string | null;
    websites: Array<microsoft_graph_website>;
    yomiCompany: string | null;
  }>;
type microsoft_graph_personType = Partial<{
  class: string | null;
  subclass: string | null;
}>;
type microsoft_graph_scoredEmailAddress = Partial<{
  address: string | null;
  itemId: string | null;
  relevanceScore: (number | null) | (string | null) | ReferenceNumeric;
  selectionLikelihood:
    | (microsoft_graph_selectionLikelihoodInfo | {})
    | Array<microsoft_graph_selectionLikelihoodInfo | {}>;
}>;
type microsoft_graph_selectionLikelihoodInfo = 'notSpecified' | 'high';
type microsoft_graph_website = Partial<{
  address: string | null;
  displayName: string | null;
  type: (microsoft_graph_websiteType | {}) | Array<microsoft_graph_websiteType | {}>;
}>;
type microsoft_graph_websiteType = 'other' | 'home' | 'work' | 'blog' | 'profile';
type microsoft_graph_plannerUser = microsoft_graph_entity &
  Partial<{
    plans: Array<microsoft_graph_plannerPlan>;
    tasks: Array<microsoft_graph_plannerTask>;
  }>;
type microsoft_graph_presence = microsoft_graph_entity &
  Partial<{
    activity: string | null;
    availability: string | null;
    statusMessage:
      | (microsoft_graph_presenceStatusMessage | {})
      | Array<microsoft_graph_presenceStatusMessage | {}>;
  }>;
type microsoft_graph_presenceStatusMessage = Partial<{
  expiryDateTime:
    | (microsoft_graph_dateTimeTimeZone | {})
    | Array<microsoft_graph_dateTimeTimeZone | {}>;
  message: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
  publishedDateTime: string | null;
}>;
type microsoft_graph_scopedRoleMembership = microsoft_graph_entity &
  Partial<{
    administrativeUnitId: string;
    roleId: string;
    roleMemberInfo: microsoft_graph_identity;
  }>;
type microsoft_graph_userSettings = microsoft_graph_entity &
  Partial<{
    contributionToContentDiscoveryAsOrganizationDisabled: boolean;
    contributionToContentDiscoveryDisabled: boolean;
    itemInsights:
      | (microsoft_graph_userInsightsSettings | {})
      | Array<microsoft_graph_userInsightsSettings | {}>;
    shiftPreferences:
      | (microsoft_graph_shiftPreferences | {})
      | Array<microsoft_graph_shiftPreferences | {}>;
    storage: (microsoft_graph_userStorage | {}) | Array<microsoft_graph_userStorage | {}>;
    windows: Array<microsoft_graph_windowsSetting>;
  }>;
type microsoft_graph_userInsightsSettings = microsoft_graph_entity &
  Partial<{
    isEnabled: boolean;
  }>;
type microsoft_graph_shiftPreferences = microsoft_graph_changeTrackedEntity &
  Partial<{
    availability: Array<microsoft_graph_shiftAvailability>;
  }>;
type microsoft_graph_shiftAvailability = Partial<{
  recurrence:
    | (microsoft_graph_patternedRecurrence | {})
    | Array<microsoft_graph_patternedRecurrence | {}>;
  timeSlots: Array<microsoft_graph_timeRange>;
  timeZone: string | null;
}>;
type microsoft_graph_timeRange = Partial<{
  endTime: string | null;
  startTime: string | null;
}>;
type microsoft_graph_userStorage = microsoft_graph_entity &
  Partial<{
    quota:
      | (microsoft_graph_unifiedStorageQuota | {})
      | Array<microsoft_graph_unifiedStorageQuota | {}>;
  }>;
type microsoft_graph_unifiedStorageQuota = microsoft_graph_entity &
  Partial<{
    deleted: number | null;
    manageWebUrl: string | null;
    remaining: number | null;
    state: string | null;
    total: number | null;
    used: number | null;
    services: Array<microsoft_graph_serviceStorageQuotaBreakdown>;
  }>;
type microsoft_graph_serviceStorageQuotaBreakdown = microsoft_graph_storageQuotaBreakdown &
  Partial<{}>;
type microsoft_graph_storageQuotaBreakdown = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    manageWebUrl: string | null;
    used: number | null;
  }>;
type microsoft_graph_windowsSetting = microsoft_graph_entity &
  Partial<{
    payloadType: string | null;
    settingType: microsoft_graph_windowsSettingType;
    windowsDeviceId: string | null;
    instances: Array<microsoft_graph_windowsSettingInstance>;
  }>;
type microsoft_graph_windowsSettingType = 'roaming' | 'backup' | 'unknownFutureValue';
type microsoft_graph_windowsSettingInstance = microsoft_graph_entity &
  Partial<{
    createdDateTime: string;
    expirationDateTime: string;
    lastModifiedDateTime: string | null;
    payload: string;
  }>;
type microsoft_graph_userSolutionRoot = microsoft_graph_entity &
  Partial<{
    workingTimeSchedule:
      | (microsoft_graph_workingTimeSchedule | {})
      | Array<microsoft_graph_workingTimeSchedule | {}>;
  }>;
type microsoft_graph_workingTimeSchedule = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_userScopeTeamsAppInstallation = microsoft_graph_teamsAppInstallation &
  Partial<{
    chat: (microsoft_graph_chat | {}) | Array<microsoft_graph_chat | {}>;
  }>;
type microsoft_graph_todo = microsoft_graph_entity &
  Partial<{
    lists: Array<microsoft_graph_todoTaskList>;
  }>;
type microsoft_graph_todoTaskList = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    isOwner: boolean;
    isShared: boolean;
    wellknownListName: microsoft_graph_wellknownListName;
    extensions: Array<microsoft_graph_extension>;
    tasks: Array<microsoft_graph_todoTask>;
  }>;
type microsoft_graph_wellknownListName =
  | 'none'
  | 'defaultList'
  | 'flaggedEmails'
  | 'unknownFutureValue';
type microsoft_graph_todoTask = microsoft_graph_entity &
  Partial<{
    body: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    bodyLastModifiedDateTime: string;
    categories: Array<string | null>;
    completedDateTime:
      | (microsoft_graph_dateTimeTimeZone | {})
      | Array<microsoft_graph_dateTimeTimeZone | {}>;
    createdDateTime: string;
    dueDateTime:
      | (microsoft_graph_dateTimeTimeZone | {})
      | Array<microsoft_graph_dateTimeTimeZone | {}>;
    hasAttachments: boolean | null;
    importance: microsoft_graph_importance;
    isReminderOn: boolean;
    lastModifiedDateTime: string;
    recurrence:
      | (microsoft_graph_patternedRecurrence | {})
      | Array<microsoft_graph_patternedRecurrence | {}>;
    reminderDateTime:
      | (microsoft_graph_dateTimeTimeZone | {})
      | Array<microsoft_graph_dateTimeTimeZone | {}>;
    startDateTime:
      | (microsoft_graph_dateTimeTimeZone | {})
      | Array<microsoft_graph_dateTimeTimeZone | {}>;
    status: microsoft_graph_taskStatus;
    title: string | null;
    attachments: Array<microsoft_graph_attachmentBase>;
    attachmentSessions: Array<microsoft_graph_attachmentSession>;
    checklistItems: Array<microsoft_graph_checklistItem>;
    extensions: Array<microsoft_graph_extension>;
    linkedResources: Array<microsoft_graph_linkedResource>;
  }>;
type microsoft_graph_taskStatus =
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'waitingOnOthers'
  | 'deferred';
type microsoft_graph_attachmentBase = microsoft_graph_entity &
  Partial<{
    contentType: string | null;
    lastModifiedDateTime: string | null;
    name: string | null;
    size: number;
  }>;
type microsoft_graph_attachmentSession = microsoft_graph_entity &
  Partial<{
    content: string | null;
    expirationDateTime: string | null;
    nextExpectedRanges: Array<string | null>;
  }>;
type microsoft_graph_checklistItem = microsoft_graph_entity &
  Partial<{
    checkedDateTime: string | null;
    createdDateTime: string;
    displayName: string | null;
    isChecked: boolean | null;
  }>;
type microsoft_graph_linkedResource = microsoft_graph_entity &
  Partial<{
    applicationName: string | null;
    displayName: string | null;
    externalId: string | null;
    webUrl: string | null;
  }>;
type microsoft_graph_quota = Partial<{
  deleted: number | null;
  remaining: number | null;
  state: string | null;
  storagePlanInformation:
    | (microsoft_graph_storagePlanInformation | {})
    | Array<microsoft_graph_storagePlanInformation | {}>;
  total: number | null;
  used: number | null;
}>;
type microsoft_graph_storagePlanInformation = Partial<{
  upgradeAvailable: boolean | null;
}>;
type microsoft_graph_accessPackageResourceRoleScope = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    role:
      | (microsoft_graph_accessPackageResourceRole | {})
      | Array<microsoft_graph_accessPackageResourceRole | {}>;
    scope:
      | (microsoft_graph_accessPackageResourceScope | {})
      | Array<microsoft_graph_accessPackageResourceScope | {}>;
  }>;
type microsoft_graph_accessPackageAssignmentPolicy = microsoft_graph_entity &
  Partial<{
    allowedTargetScope:
      | (microsoft_graph_allowedTargetScope | {})
      | Array<microsoft_graph_allowedTargetScope | {}>;
    automaticRequestSettings:
      | (microsoft_graph_accessPackageAutomaticRequestSettings | {})
      | Array<microsoft_graph_accessPackageAutomaticRequestSettings | {}>;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    expiration:
      | (microsoft_graph_expirationPattern | {})
      | Array<microsoft_graph_expirationPattern | {}>;
    modifiedDateTime: string | null;
    notificationSettings:
      | (microsoft_graph_accessPackageNotificationSettings | {})
      | Array<microsoft_graph_accessPackageNotificationSettings | {}>;
    requestApprovalSettings:
      | (microsoft_graph_accessPackageAssignmentApprovalSettings | {})
      | Array<microsoft_graph_accessPackageAssignmentApprovalSettings | {}>;
    requestorSettings:
      | (microsoft_graph_accessPackageAssignmentRequestorSettings | {})
      | Array<microsoft_graph_accessPackageAssignmentRequestorSettings | {}>;
    reviewSettings:
      | (microsoft_graph_accessPackageAssignmentReviewSettings | {})
      | Array<microsoft_graph_accessPackageAssignmentReviewSettings | {}>;
    specificAllowedTargets: Array<microsoft_graph_subjectSet>;
    accessPackage: (microsoft_graph_accessPackage | {}) | Array<microsoft_graph_accessPackage | {}>;
    catalog:
      | (microsoft_graph_accessPackageCatalog | {})
      | Array<microsoft_graph_accessPackageCatalog | {}>;
    customExtensionStageSettings: Array<microsoft_graph_customExtensionStageSetting>;
    questions: Array<microsoft_graph_accessPackageQuestion>;
  }>;
type microsoft_graph_accessPackageCatalog = microsoft_graph_entity &
  Partial<{
    catalogType:
      | (microsoft_graph_accessPackageCatalogType | {})
      | Array<microsoft_graph_accessPackageCatalogType | {}>;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    isExternallyVisible: boolean | null;
    modifiedDateTime: string | null;
    state:
      | (microsoft_graph_accessPackageCatalogState | {})
      | Array<microsoft_graph_accessPackageCatalogState | {}>;
    accessPackages: Array<microsoft_graph_accessPackage>;
    customWorkflowExtensions: Array<microsoft_graph_customCalloutExtension>;
    resourceRoles: Array<microsoft_graph_accessPackageResourceRole>;
    resources: Array<microsoft_graph_accessPackageResource>;
    resourceScopes: Array<microsoft_graph_accessPackageResourceScope>;
  }>;
type microsoft_graph_accessPackageResource = microsoft_graph_entity &
  Partial<{
    attributes: Array<microsoft_graph_accessPackageResourceAttribute>;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    modifiedDateTime: string | null;
    originId: string | null;
    originSystem: string | null;
    environment:
      | (microsoft_graph_accessPackageResourceEnvironment | {})
      | Array<microsoft_graph_accessPackageResourceEnvironment | {}>;
    roles: Array<microsoft_graph_accessPackageResourceRole>;
    scopes: Array<microsoft_graph_accessPackageResourceScope>;
  }>;
type microsoft_graph_accessPackageResourceEnvironment = microsoft_graph_entity &
  Partial<{
    connectionInfo:
      | (microsoft_graph_connectionInfo | {})
      | Array<microsoft_graph_connectionInfo | {}>;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    isDefaultEnvironment: boolean | null;
    modifiedDateTime: string | null;
    originId: string | null;
    originSystem: string | null;
    resources: Array<microsoft_graph_accessPackageResource>;
  }>;
type microsoft_graph_accessPackageResourceRole = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string | null;
    originId: string | null;
    originSystem: string | null;
    resource:
      | (microsoft_graph_accessPackageResource | {})
      | Array<microsoft_graph_accessPackageResource | {}>;
  }>;
type microsoft_graph_accessPackageResourceScope = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string | null;
    isRootScope: boolean | null;
    originId: string | null;
    originSystem: string | null;
    resource:
      | (microsoft_graph_accessPackageResource | {})
      | Array<microsoft_graph_accessPackageResource | {}>;
  }>;
type microsoft_graph_activityHistoryItem = microsoft_graph_entity &
  Partial<{
    activeDurationSeconds: number | null;
    createdDateTime: string | null;
    expirationDateTime: string | null;
    lastActiveDateTime: string | null;
    lastModifiedDateTime: string | null;
    startedDateTime: string;
    status: (microsoft_graph_status | {}) | Array<microsoft_graph_status | {}>;
    userTimezone: string | null;
    activity: microsoft_graph_userActivity;
  }>;
type microsoft_graph_associatedTeamInfo = microsoft_graph_teamInfo & Partial<{}>;
type microsoft_graph_baseItem = microsoft_graph_entity &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string;
    description: string | null;
    eTag: string | null;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string;
    name: string | null;
    parentReference:
      | (microsoft_graph_itemReference | {})
      | Array<microsoft_graph_itemReference | {}>;
    webUrl: string | null;
    createdByUser: (microsoft_graph_user | {}) | Array<microsoft_graph_user | {}>;
    lastModifiedByUser: (microsoft_graph_user | {}) | Array<microsoft_graph_user | {}>;
  }>;
type microsoft_graph_baseSitePage = microsoft_graph_baseItem &
  Partial<{
    pageLayout: (microsoft_graph_pageLayoutType | {}) | Array<microsoft_graph_pageLayoutType | {}>;
    publishingState:
      | (microsoft_graph_publicationFacet | {})
      | Array<microsoft_graph_publicationFacet | {}>;
    title: string | null;
  }>;
type microsoft_graph_calendar = microsoft_graph_entity &
  Partial<{
    allowedOnlineMeetingProviders: Array<
      | (microsoft_graph_onlineMeetingProviderType | {})
      | Array<microsoft_graph_onlineMeetingProviderType | {}>
    >;
    canEdit: boolean | null;
    canShare: boolean | null;
    canViewPrivateItems: boolean | null;
    changeKey: string | null;
    color: (microsoft_graph_calendarColor | {}) | Array<microsoft_graph_calendarColor | {}>;
    defaultOnlineMeetingProvider:
      | (microsoft_graph_onlineMeetingProviderType | {})
      | Array<microsoft_graph_onlineMeetingProviderType | {}>;
    hexColor: string | null;
    isDefaultCalendar: boolean | null;
    isRemovable: boolean | null;
    isTallyingResponses: boolean | null;
    name: string | null;
    owner: (microsoft_graph_emailAddress | {}) | Array<microsoft_graph_emailAddress | {}>;
    calendarPermissions: Array<microsoft_graph_calendarPermission>;
    calendarView: Array<microsoft_graph_event>;
    events: Array<microsoft_graph_event>;
    multiValueExtendedProperties: Array<microsoft_graph_multiValueLegacyExtendedProperty>;
    singleValueExtendedProperties: Array<microsoft_graph_singleValueLegacyExtendedProperty>;
  }>;
type microsoft_graph_channel = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    description: string | null;
    displayName: string;
    email: string | null;
    isArchived: boolean | null;
    isFavoriteByDefault: boolean | null;
    membershipType:
      | (microsoft_graph_channelMembershipType | {})
      | Array<microsoft_graph_channelMembershipType | {}>;
    summary: (microsoft_graph_channelSummary | {}) | Array<microsoft_graph_channelSummary | {}>;
    tenantId: string | null;
    webUrl: string | null;
    allMembers: Array<microsoft_graph_conversationMember>;
    filesFolder: (microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>;
    members: Array<microsoft_graph_conversationMember>;
    messages: Array<microsoft_graph_chatMessage>;
    sharedWithTeams: Array<microsoft_graph_sharedWithChannelTeamInfo>;
    tabs: Array<microsoft_graph_teamsTab>;
  }>;
type microsoft_graph_chatMessage = microsoft_graph_entity &
  Partial<{
    attachments: Array<microsoft_graph_chatMessageAttachment>;
    body: microsoft_graph_itemBody;
    channelIdentity:
      | (microsoft_graph_channelIdentity | {})
      | Array<microsoft_graph_channelIdentity | {}>;
    chatId: string | null;
    createdDateTime: string | null;
    deletedDateTime: string | null;
    etag: string | null;
    eventDetail:
      | (microsoft_graph_eventMessageDetail | {})
      | Array<microsoft_graph_eventMessageDetail | {}>;
    from:
      | (microsoft_graph_chatMessageFromIdentitySet | {})
      | Array<microsoft_graph_chatMessageFromIdentitySet | {}>;
    importance: microsoft_graph_chatMessageImportance;
    lastEditedDateTime: string | null;
    lastModifiedDateTime: string | null;
    locale: string;
    mentions: Array<microsoft_graph_chatMessageMention>;
    messageHistory: Array<microsoft_graph_chatMessageHistoryItem>;
    messageType: microsoft_graph_chatMessageType;
    policyViolation:
      | (microsoft_graph_chatMessagePolicyViolation | {})
      | Array<microsoft_graph_chatMessagePolicyViolation | {}>;
    reactions: Array<microsoft_graph_chatMessageReaction>;
    replyToId: string | null;
    subject: string | null;
    summary: string | null;
    webUrl: string | null;
    hostedContents: Array<microsoft_graph_chatMessageHostedContent>;
    replies: Array<microsoft_graph_chatMessage>;
  }>;
type microsoft_graph_columnDefinition = microsoft_graph_entity &
  Partial<{
    boolean: (microsoft_graph_booleanColumn | {}) | Array<microsoft_graph_booleanColumn | {}>;
    calculated:
      | (microsoft_graph_calculatedColumn | {})
      | Array<microsoft_graph_calculatedColumn | {}>;
    choice: (microsoft_graph_choiceColumn | {}) | Array<microsoft_graph_choiceColumn | {}>;
    columnGroup: string | null;
    contentApprovalStatus:
      | (microsoft_graph_contentApprovalStatusColumn | {})
      | Array<microsoft_graph_contentApprovalStatusColumn | {}>;
    currency: (microsoft_graph_currencyColumn | {}) | Array<microsoft_graph_currencyColumn | {}>;
    dateTime: (microsoft_graph_dateTimeColumn | {}) | Array<microsoft_graph_dateTimeColumn | {}>;
    defaultValue:
      | (microsoft_graph_defaultColumnValue | {})
      | Array<microsoft_graph_defaultColumnValue | {}>;
    description: string | null;
    displayName: string | null;
    enforceUniqueValues: boolean | null;
    geolocation:
      | (microsoft_graph_geolocationColumn | {})
      | Array<microsoft_graph_geolocationColumn | {}>;
    hidden: boolean | null;
    hyperlinkOrPicture:
      | (microsoft_graph_hyperlinkOrPictureColumn | {})
      | Array<microsoft_graph_hyperlinkOrPictureColumn | {}>;
    indexed: boolean | null;
    isDeletable: boolean | null;
    isReorderable: boolean | null;
    isSealed: boolean | null;
    lookup: (microsoft_graph_lookupColumn | {}) | Array<microsoft_graph_lookupColumn | {}>;
    name: string | null;
    number: (microsoft_graph_numberColumn | {}) | Array<microsoft_graph_numberColumn | {}>;
    personOrGroup:
      | (microsoft_graph_personOrGroupColumn | {})
      | Array<microsoft_graph_personOrGroupColumn | {}>;
    propagateChanges: boolean | null;
    readOnly: boolean | null;
    required: boolean | null;
    sourceContentType:
      | (microsoft_graph_contentTypeInfo | {})
      | Array<microsoft_graph_contentTypeInfo | {}>;
    term: (microsoft_graph_termColumn | {}) | Array<microsoft_graph_termColumn | {}>;
    text: (microsoft_graph_textColumn | {}) | Array<microsoft_graph_textColumn | {}>;
    thumbnail: (microsoft_graph_thumbnailColumn | {}) | Array<microsoft_graph_thumbnailColumn | {}>;
    type: (microsoft_graph_columnTypes | {}) | Array<microsoft_graph_columnTypes | {}>;
    validation:
      | (microsoft_graph_columnValidation | {})
      | Array<microsoft_graph_columnValidation | {}>;
    sourceColumn:
      | (microsoft_graph_columnDefinition | {})
      | Array<microsoft_graph_columnDefinition | {}>;
  }>;
type microsoft_graph_contactFolder = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    parentFolderId: string | null;
    childFolders: Array<microsoft_graph_contactFolder>;
    contacts: Array<microsoft_graph_contact>;
    multiValueExtendedProperties: Array<microsoft_graph_multiValueLegacyExtendedProperty>;
    singleValueExtendedProperties: Array<microsoft_graph_singleValueLegacyExtendedProperty>;
  }>;
type microsoft_graph_contentType = microsoft_graph_entity &
  Partial<{
    associatedHubsUrls: Array<string | null>;
    description: string | null;
    documentSet: (microsoft_graph_documentSet | {}) | Array<microsoft_graph_documentSet | {}>;
    documentTemplate:
      | (microsoft_graph_documentSetContent | {})
      | Array<microsoft_graph_documentSetContent | {}>;
    group: string | null;
    hidden: boolean | null;
    inheritedFrom: (microsoft_graph_itemReference | {}) | Array<microsoft_graph_itemReference | {}>;
    isBuiltIn: boolean | null;
    name: string | null;
    order: (microsoft_graph_contentTypeOrder | {}) | Array<microsoft_graph_contentTypeOrder | {}>;
    parentId: string | null;
    propagateChanges: boolean | null;
    readOnly: boolean | null;
    sealed: boolean | null;
    base: (microsoft_graph_contentType | {}) | Array<microsoft_graph_contentType | {}>;
    baseTypes: Array<microsoft_graph_contentType>;
    columnLinks: Array<microsoft_graph_columnLink>;
    columnPositions: Array<microsoft_graph_columnDefinition>;
    columns: Array<microsoft_graph_columnDefinition>;
  }>;
type microsoft_graph_domain = microsoft_graph_entity &
  Partial<{
    authenticationType: string;
    availabilityStatus: string | null;
    isAdminManaged: boolean;
    isDefault: boolean;
    isInitial: boolean;
    isRoot: boolean;
    isVerified: boolean;
    manufacturer: string | null;
    model: string | null;
    passwordNotificationWindowInDays: number | null;
    passwordValidityPeriodInDays: number | null;
    state: (microsoft_graph_domainState | {}) | Array<microsoft_graph_domainState | {}>;
    supportedServices: Array<string>;
    domainNameReferences: Array<microsoft_graph_directoryObject>;
    federationConfiguration: Array<microsoft_graph_internalDomainFederation>;
    rootDomain: (microsoft_graph_domain | {}) | Array<microsoft_graph_domain | {}>;
    serviceConfigurationRecords: Array<microsoft_graph_domainDnsRecord>;
    verificationDnsRecords: Array<microsoft_graph_domainDnsRecord>;
  }>;
type microsoft_graph_domainState = Partial<{
  lastActionDateTime: string | null;
  operation: string | null;
  status: string | null;
}>;
type microsoft_graph_internalDomainFederation = microsoft_graph_samlOrWsFedProvider &
  Partial<{
    activeSignInUri: string | null;
    federatedIdpMfaBehavior:
      | (microsoft_graph_federatedIdpMfaBehavior | {})
      | Array<microsoft_graph_federatedIdpMfaBehavior | {}>;
    isSignedAuthenticationRequestRequired: boolean | null;
    nextSigningCertificate: string | null;
    passwordResetUri: string | null;
    promptLoginBehavior:
      | (microsoft_graph_promptLoginBehavior | {})
      | Array<microsoft_graph_promptLoginBehavior | {}>;
    signingCertificateUpdateStatus:
      | (microsoft_graph_signingCertificateUpdateStatus | {})
      | Array<microsoft_graph_signingCertificateUpdateStatus | {}>;
    signOutUri: string | null;
  }>;
type microsoft_graph_samlOrWsFedProvider = microsoft_graph_identityProviderBase &
  Partial<{
    issuerUri: string | null;
    metadataExchangeUri: string | null;
    passiveSignInUri: string | null;
    preferredAuthenticationProtocol:
      | (microsoft_graph_authenticationProtocol | {})
      | Array<microsoft_graph_authenticationProtocol | {}>;
    signingCertificate: string | null;
  }>;
type microsoft_graph_identityProviderBase = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
  }>;
type microsoft_graph_authenticationProtocol = 'wsFed' | 'saml' | 'unknownFutureValue';
type microsoft_graph_federatedIdpMfaBehavior =
  | 'acceptIfMfaDoneByFederatedIdp'
  | 'enforceMfaByFederatedIdp'
  | 'rejectMfaByFederatedIdp'
  | 'unknownFutureValue';
type microsoft_graph_promptLoginBehavior =
  | 'translateToFreshPasswordAuthentication'
  | 'nativeSupport'
  | 'disabled'
  | 'unknownFutureValue';
type microsoft_graph_signingCertificateUpdateStatus = Partial<{
  certificateUpdateResult: string | null;
  lastRunDateTime: string | null;
}>;
type microsoft_graph_domainDnsRecord = microsoft_graph_entity &
  Partial<{
    isOptional: boolean;
    label: string;
    recordType: string | null;
    supportedService: string;
    ttl: number;
  }>;
type microsoft_graph_drive = microsoft_graph_baseItem &
  Partial<{
    driveType: string | null;
    owner: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    quota: (microsoft_graph_quota | {}) | Array<microsoft_graph_quota | {}>;
    sharePointIds: (microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>;
    system: (microsoft_graph_systemFacet | {}) | Array<microsoft_graph_systemFacet | {}>;
    bundles: Array<microsoft_graph_driveItem>;
    following: Array<microsoft_graph_driveItem>;
    items: Array<microsoft_graph_driveItem>;
    list: (microsoft_graph_list | {}) | Array<microsoft_graph_list | {}>;
    root: (microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>;
    special: Array<microsoft_graph_driveItem>;
  }>;
type microsoft_graph_driveItem = microsoft_graph_baseItem &
  Partial<{
    audio: (microsoft_graph_audio | {}) | Array<microsoft_graph_audio | {}>;
    bundle: (microsoft_graph_bundle | {}) | Array<microsoft_graph_bundle | {}>;
    content: string | null;
    cTag: string | null;
    deleted: (microsoft_graph_deleted | {}) | Array<microsoft_graph_deleted | {}>;
    file: (microsoft_graph_file | {}) | Array<microsoft_graph_file | {}>;
    fileSystemInfo:
      | (microsoft_graph_fileSystemInfo | {})
      | Array<microsoft_graph_fileSystemInfo | {}>;
    folder: (microsoft_graph_folder | {}) | Array<microsoft_graph_folder | {}>;
    image: (microsoft_graph_image | {}) | Array<microsoft_graph_image | {}>;
    location: (microsoft_graph_geoCoordinates | {}) | Array<microsoft_graph_geoCoordinates | {}>;
    malware: (microsoft_graph_malware | {}) | Array<microsoft_graph_malware | {}>;
    package: (microsoft_graph_package | {}) | Array<microsoft_graph_package | {}>;
    pendingOperations:
      | (microsoft_graph_pendingOperations | {})
      | Array<microsoft_graph_pendingOperations | {}>;
    photo: (microsoft_graph_photo | {}) | Array<microsoft_graph_photo | {}>;
    publication:
      | (microsoft_graph_publicationFacet | {})
      | Array<microsoft_graph_publicationFacet | {}>;
    remoteItem: (microsoft_graph_remoteItem | {}) | Array<microsoft_graph_remoteItem | {}>;
    root: (microsoft_graph_root | {}) | Array<microsoft_graph_root | {}>;
    searchResult: (microsoft_graph_searchResult | {}) | Array<microsoft_graph_searchResult | {}>;
    shared: (microsoft_graph_shared | {}) | Array<microsoft_graph_shared | {}>;
    sharepointIds: (microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>;
    size: number | null;
    specialFolder: (microsoft_graph_specialFolder | {}) | Array<microsoft_graph_specialFolder | {}>;
    video: (microsoft_graph_video | {}) | Array<microsoft_graph_video | {}>;
    webDavUrl: string | null;
    analytics: (microsoft_graph_itemAnalytics | {}) | Array<microsoft_graph_itemAnalytics | {}>;
    children: Array<microsoft_graph_driveItem>;
    listItem: (microsoft_graph_listItem | {}) | Array<microsoft_graph_listItem | {}>;
    permissions: Array<microsoft_graph_permission>;
    retentionLabel:
      | (microsoft_graph_itemRetentionLabel | {})
      | Array<microsoft_graph_itemRetentionLabel | {}>;
    subscriptions: Array<microsoft_graph_subscription>;
    thumbnails: Array<microsoft_graph_thumbnailSet>;
    versions: Array<microsoft_graph_driveItemVersion>;
    workbook: (microsoft_graph_workbook | {}) | Array<microsoft_graph_workbook | {}>;
  }>;
type microsoft_graph_educationClass = microsoft_graph_entity &
  Partial<{
    classCode: string | null;
    course: (microsoft_graph_educationCourse | {}) | Array<microsoft_graph_educationCourse | {}>;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    description: string | null;
    displayName: string;
    externalId: string | null;
    externalName: string | null;
    externalSource:
      | (microsoft_graph_educationExternalSource | {})
      | Array<microsoft_graph_educationExternalSource | {}>;
    externalSourceDetail: string | null;
    grade: string | null;
    mailNickname: string;
    term: (microsoft_graph_educationTerm | {}) | Array<microsoft_graph_educationTerm | {}>;
    assignmentCategories: Array<microsoft_graph_educationCategory>;
    assignmentDefaults:
      | (microsoft_graph_educationAssignmentDefaults | {})
      | Array<microsoft_graph_educationAssignmentDefaults | {}>;
    assignments: Array<microsoft_graph_educationAssignment>;
    assignmentSettings:
      | (microsoft_graph_educationAssignmentSettings | {})
      | Array<microsoft_graph_educationAssignmentSettings | {}>;
    group: (microsoft_graph_group | {}) | Array<microsoft_graph_group | {}>;
    members: Array<microsoft_graph_educationUser>;
    modules: Array<microsoft_graph_educationModule>;
    schools: Array<microsoft_graph_educationSchool>;
    teachers: Array<microsoft_graph_educationUser>;
  }>;
type microsoft_graph_educationCourse = Partial<{
  courseNumber: string | null;
  description: string | null;
  displayName: string | null;
  externalId: string | null;
  subject: string | null;
}>;
type microsoft_graph_educationExternalSource = 'sis' | 'manual' | 'unknownFutureValue';
type microsoft_graph_educationTerm = Partial<{
  displayName: string | null;
  endDate: string | null;
  externalId: string | null;
  startDate: string | null;
}>;
type microsoft_graph_educationCategory = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
  }>;
type microsoft_graph_educationAssignmentDefaults = microsoft_graph_entity &
  Partial<{
    addedStudentAction:
      | (microsoft_graph_educationAddedStudentAction | {})
      | Array<microsoft_graph_educationAddedStudentAction | {}>;
    addToCalendarAction:
      | (microsoft_graph_educationAddToCalendarOptions | {})
      | Array<microsoft_graph_educationAddToCalendarOptions | {}>;
    dueTime: string | null;
    notificationChannelUrl: string | null;
  }>;
type microsoft_graph_educationAddedStudentAction = 'none' | 'assignIfOpen' | 'unknownFutureValue';
type microsoft_graph_educationAddToCalendarOptions =
  | 'none'
  | 'studentsAndPublisher'
  | 'studentsAndTeamOwners'
  | 'unknownFutureValue'
  | 'studentsOnly';
type microsoft_graph_educationAssignment = microsoft_graph_entity &
  Partial<{
    addedStudentAction:
      | (microsoft_graph_educationAddedStudentAction | {})
      | Array<microsoft_graph_educationAddedStudentAction | {}>;
    addToCalendarAction:
      | (microsoft_graph_educationAddToCalendarOptions | {})
      | Array<microsoft_graph_educationAddToCalendarOptions | {}>;
    allowLateSubmissions: boolean | null;
    allowStudentsToAddResourcesToSubmission: boolean | null;
    assignDateTime: string | null;
    assignedDateTime: string | null;
    assignTo:
      | (microsoft_graph_educationAssignmentRecipient | {})
      | Array<microsoft_graph_educationAssignmentRecipient | {}>;
    classId: string | null;
    closeDateTime: string | null;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    displayName: string | null;
    dueDateTime: string | null;
    feedbackResourcesFolderUrl: string | null;
    grading:
      | (microsoft_graph_educationAssignmentGradeType | {})
      | Array<microsoft_graph_educationAssignmentGradeType | {}>;
    instructions:
      | (microsoft_graph_educationItemBody | {})
      | Array<microsoft_graph_educationItemBody | {}>;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
    moduleUrl: string | null;
    notificationChannelUrl: string | null;
    resourcesFolderUrl: string | null;
    status:
      | (microsoft_graph_educationAssignmentStatus | {})
      | Array<microsoft_graph_educationAssignmentStatus | {}>;
    webUrl: string | null;
    categories: Array<microsoft_graph_educationCategory>;
    gradingCategory:
      | (microsoft_graph_educationGradingCategory | {})
      | Array<microsoft_graph_educationGradingCategory | {}>;
    resources: Array<microsoft_graph_educationAssignmentResource>;
    rubric: (microsoft_graph_educationRubric | {}) | Array<microsoft_graph_educationRubric | {}>;
    submissions: Array<microsoft_graph_educationSubmission>;
  }>;
type microsoft_graph_educationAssignmentRecipient = Partial<{}>;
type microsoft_graph_educationAssignmentGradeType = Partial<{}>;
type microsoft_graph_educationItemBody = Partial<{
  content: string | null;
  contentType: (microsoft_graph_bodyType | {}) | Array<microsoft_graph_bodyType | {}>;
}>;
type microsoft_graph_educationAssignmentStatus =
  | 'draft'
  | 'published'
  | 'assigned'
  | 'unknownFutureValue'
  | 'inactive';
type microsoft_graph_educationGradingCategory = microsoft_graph_entity &
  Partial<{
    displayName: string;
    percentageWeight: number;
  }>;
type microsoft_graph_educationAssignmentResource = microsoft_graph_entity &
  Partial<{
    distributeForStudentWork: boolean | null;
    resource:
      | (microsoft_graph_educationResource | {})
      | Array<microsoft_graph_educationResource | {}>;
  }>;
type microsoft_graph_educationResource = Partial<{
  createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  createdDateTime: string | null;
  displayName: string | null;
  lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
  lastModifiedDateTime: string | null;
}>;
type microsoft_graph_educationRubric = microsoft_graph_entity &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    description:
      | (microsoft_graph_educationItemBody | {})
      | Array<microsoft_graph_educationItemBody | {}>;
    displayName: string | null;
    grading:
      | (microsoft_graph_educationAssignmentGradeType | {})
      | Array<microsoft_graph_educationAssignmentGradeType | {}>;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
    levels: Array<microsoft_graph_rubricLevel>;
    qualities: Array<microsoft_graph_rubricQuality>;
  }>;
type microsoft_graph_rubricLevel = Partial<{
  description:
    | (microsoft_graph_educationItemBody | {})
    | Array<microsoft_graph_educationItemBody | {}>;
  displayName: string | null;
  grading:
    | (microsoft_graph_educationAssignmentGradeType | {})
    | Array<microsoft_graph_educationAssignmentGradeType | {}>;
  levelId: string | null;
}>;
type microsoft_graph_rubricQuality = Partial<{
  criteria: Array<microsoft_graph_rubricCriterion>;
  description:
    | (microsoft_graph_educationItemBody | {})
    | Array<microsoft_graph_educationItemBody | {}>;
  displayName: string | null;
  qualityId: string | null;
  weight: (number | null) | (string | null) | ReferenceNumeric;
}>;
type microsoft_graph_rubricCriterion = Partial<{
  description:
    | (microsoft_graph_educationItemBody | {})
    | Array<microsoft_graph_educationItemBody | {}>;
}>;
type microsoft_graph_educationSubmission = microsoft_graph_entity &
  Partial<{
    assignmentId: string | null;
    excusedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    excusedDateTime: string | null;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
    reassignedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    reassignedDateTime: string | null;
    recipient:
      | (microsoft_graph_educationSubmissionRecipient | {})
      | Array<microsoft_graph_educationSubmissionRecipient | {}>;
    resourcesFolderUrl: string | null;
    returnedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    returnedDateTime: string | null;
    status:
      | (microsoft_graph_educationSubmissionStatus | {})
      | Array<microsoft_graph_educationSubmissionStatus | {}>;
    submittedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    submittedDateTime: string | null;
    unsubmittedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    unsubmittedDateTime: string | null;
    webUrl: string | null;
    outcomes: Array<microsoft_graph_educationOutcome>;
    resources: Array<microsoft_graph_educationSubmissionResource>;
    submittedResources: Array<microsoft_graph_educationSubmissionResource>;
  }>;
type microsoft_graph_educationSubmissionRecipient = Partial<{}>;
type microsoft_graph_educationSubmissionStatus =
  | 'working'
  | 'submitted'
  | 'released'
  | 'returned'
  | 'unknownFutureValue'
  | 'reassigned'
  | 'excused';
type microsoft_graph_educationOutcome = microsoft_graph_entity &
  Partial<{
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
  }>;
type microsoft_graph_educationSubmissionResource = microsoft_graph_entity &
  Partial<{
    assignmentResourceUrl: string | null;
    resource:
      | (microsoft_graph_educationResource | {})
      | Array<microsoft_graph_educationResource | {}>;
  }>;
type microsoft_graph_educationAssignmentSettings = microsoft_graph_entity &
  Partial<{
    submissionAnimationDisabled: boolean | null;
    gradingCategories: Array<microsoft_graph_educationGradingCategory>;
  }>;
type microsoft_graph_educationOnPremisesInfo = Partial<{
  immutableId: string | null;
}>;
type microsoft_graph_educationUserRole = 'student' | 'teacher' | 'none' | 'unknownFutureValue';
type microsoft_graph_relatedContact = Partial<{
  accessConsent: boolean | null;
  displayName: string;
  emailAddress: string;
  mobilePhone: string | null;
  relationship: microsoft_graph_contactRelationship;
}>;
type microsoft_graph_contactRelationship =
  | 'parent'
  | 'relative'
  | 'aide'
  | 'doctor'
  | 'guardian'
  | 'child'
  | 'other'
  | 'unknownFutureValue';
type microsoft_graph_educationStudent = Partial<{
  birthDate: string | null;
  externalId: string | null;
  gender: (microsoft_graph_educationGender | {}) | Array<microsoft_graph_educationGender | {}>;
  grade: string | null;
  graduationYear: string | null;
  studentNumber: string | null;
}>;
type microsoft_graph_educationGender = 'female' | 'male' | 'other' | 'unknownFutureValue';
type microsoft_graph_educationTeacher = Partial<{
  externalId: string | null;
  teacherNumber: string | null;
}>;
type microsoft_graph_educationOrganization = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string;
    externalSource:
      | (microsoft_graph_educationExternalSource | {})
      | Array<microsoft_graph_educationExternalSource | {}>;
    externalSourceDetail: string | null;
  }>;
type microsoft_graph_administrativeUnit = microsoft_graph_directoryObject &
  Partial<{
    description: string | null;
    displayName: string | null;
    isMemberManagementRestricted: boolean | null;
    membershipRule: string | null;
    membershipRuleProcessingState: string | null;
    membershipType: string | null;
    visibility: string | null;
    extensions: Array<microsoft_graph_extension>;
    members: Array<microsoft_graph_directoryObject>;
    scopedRoleMembers: Array<microsoft_graph_scopedRoleMembership>;
  }>;
type microsoft_graph_educationModule = microsoft_graph_entity &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    isPinned: boolean | null;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
    resourcesFolderUrl: string | null;
    status:
      | (microsoft_graph_educationModuleStatus | {})
      | Array<microsoft_graph_educationModuleStatus | {}>;
    resources: Array<microsoft_graph_educationModuleResource>;
  }>;
type microsoft_graph_educationModuleStatus = 'draft' | 'published' | 'unknownFutureValue';
type microsoft_graph_educationModuleResource = microsoft_graph_entity &
  Partial<{
    resource:
      | (microsoft_graph_educationResource | {})
      | Array<microsoft_graph_educationResource | {}>;
  }>;
type microsoft_graph_educationSchool = microsoft_graph_educationOrganization &
  Partial<{
    address: (microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    externalId: string | null;
    externalPrincipalId: string | null;
    fax: string | null;
    highestGrade: string | null;
    lowestGrade: string | null;
    phone: string | null;
    principalEmail: string | null;
    principalName: string | null;
    schoolNumber: string | null;
    administrativeUnit:
      | (microsoft_graph_administrativeUnit | {})
      | Array<microsoft_graph_administrativeUnit | {}>;
    classes: Array<microsoft_graph_educationClass>;
    users: Array<microsoft_graph_educationUser>;
  }>;
type microsoft_graph_educationUser = microsoft_graph_entity &
  Partial<{
    accountEnabled: boolean | null;
    assignedLicenses: Array<microsoft_graph_assignedLicense>;
    assignedPlans: Array<microsoft_graph_assignedPlan>;
    businessPhones: Array<string>;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    department: string | null;
    displayName: string | null;
    externalSource:
      | (microsoft_graph_educationExternalSource | {})
      | Array<microsoft_graph_educationExternalSource | {}>;
    externalSourceDetail: string | null;
    givenName: string | null;
    mail: string | null;
    mailingAddress:
      | (microsoft_graph_physicalAddress | {})
      | Array<microsoft_graph_physicalAddress | {}>;
    mailNickname: string | null;
    middleName: string | null;
    mobilePhone: string | null;
    officeLocation: string | null;
    onPremisesInfo:
      | (microsoft_graph_educationOnPremisesInfo | {})
      | Array<microsoft_graph_educationOnPremisesInfo | {}>;
    passwordPolicies: string | null;
    passwordProfile:
      | (microsoft_graph_passwordProfile | {})
      | Array<microsoft_graph_passwordProfile | {}>;
    preferredLanguage: string | null;
    primaryRole: microsoft_graph_educationUserRole;
    provisionedPlans: Array<microsoft_graph_provisionedPlan>;
    refreshTokensValidFromDateTime: string | null;
    relatedContacts: Array<microsoft_graph_relatedContact>;
    residenceAddress:
      | (microsoft_graph_physicalAddress | {})
      | Array<microsoft_graph_physicalAddress | {}>;
    showInAddressList: boolean | null;
    student: (microsoft_graph_educationStudent | {}) | Array<microsoft_graph_educationStudent | {}>;
    surname: string | null;
    teacher: (microsoft_graph_educationTeacher | {}) | Array<microsoft_graph_educationTeacher | {}>;
    usageLocation: string | null;
    userPrincipalName: string | null;
    userType: string | null;
    assignments: Array<microsoft_graph_educationAssignment>;
    classes: Array<microsoft_graph_educationClass>;
    rubrics: Array<microsoft_graph_educationRubric>;
    schools: Array<microsoft_graph_educationSchool>;
    taughtClasses: Array<microsoft_graph_educationClass>;
    user: (microsoft_graph_user | {}) | Array<microsoft_graph_user | {}>;
  }>;
type microsoft_graph_event = microsoft_graph_outlookItem &
  Partial<{
    allowNewTimeProposals: boolean | null;
    attendees: Array<microsoft_graph_attendee>;
    body: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    bodyPreview: string | null;
    cancelledOccurrences: Array<string>;
    end: (microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>;
    hasAttachments: boolean | null;
    hideAttendees: boolean | null;
    iCalUId: string | null;
    importance: (microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>;
    isAllDay: boolean | null;
    isCancelled: boolean | null;
    isDraft: boolean | null;
    isOnlineMeeting: boolean | null;
    isOrganizer: boolean | null;
    isReminderOn: boolean | null;
    location: (microsoft_graph_location | {}) | Array<microsoft_graph_location | {}>;
    locations: Array<microsoft_graph_location>;
    onlineMeeting:
      | (microsoft_graph_onlineMeetingInfo | {})
      | Array<microsoft_graph_onlineMeetingInfo | {}>;
    onlineMeetingProvider:
      | (microsoft_graph_onlineMeetingProviderType | {})
      | Array<microsoft_graph_onlineMeetingProviderType | {}>;
    onlineMeetingUrl: string | null;
    organizer: (microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>;
    originalEndTimeZone: string | null;
    originalStart: string | null;
    originalStartTimeZone: string | null;
    recurrence:
      | (microsoft_graph_patternedRecurrence | {})
      | Array<microsoft_graph_patternedRecurrence | {}>;
    reminderMinutesBeforeStart: number | null;
    responseRequested: boolean | null;
    responseStatus:
      | (microsoft_graph_responseStatus | {})
      | Array<microsoft_graph_responseStatus | {}>;
    sensitivity: (microsoft_graph_sensitivity | {}) | Array<microsoft_graph_sensitivity | {}>;
    seriesMasterId: string | null;
    showAs: (microsoft_graph_freeBusyStatus | {}) | Array<microsoft_graph_freeBusyStatus | {}>;
    start: (microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>;
    subject: string | null;
    transactionId: string | null;
    type: (microsoft_graph_eventType | {}) | Array<microsoft_graph_eventType | {}>;
    webLink: string | null;
    attachments: Array<microsoft_graph_attachment>;
    calendar: (microsoft_graph_calendar | {}) | Array<microsoft_graph_calendar | {}>;
    exceptionOccurrences: Array<microsoft_graph_event>;
    extensions: Array<microsoft_graph_extension>;
    instances: Array<microsoft_graph_event>;
    multiValueExtendedProperties: Array<microsoft_graph_multiValueLegacyExtendedProperty>;
    singleValueExtendedProperties: Array<microsoft_graph_singleValueLegacyExtendedProperty>;
  }>;
type microsoft_graph_group = microsoft_graph_directoryObject &
  Partial<{
    allowExternalSenders: boolean | null;
    assignedLabels: Array<microsoft_graph_assignedLabel>;
    assignedLicenses: Array<microsoft_graph_assignedLicense>;
    autoSubscribeNewMembers: boolean | null;
    classification: string | null;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    expirationDateTime: string | null;
    groupTypes: Array<string>;
    hasMembersWithLicenseErrors: boolean | null;
    hideFromAddressLists: boolean | null;
    hideFromOutlookClients: boolean | null;
    isArchived: boolean | null;
    isAssignableToRole: boolean | null;
    isManagementRestricted: boolean | null;
    isSubscribedByMail: boolean | null;
    licenseProcessingState:
      | (microsoft_graph_licenseProcessingState | {})
      | Array<microsoft_graph_licenseProcessingState | {}>;
    mail: string | null;
    mailEnabled: boolean | null;
    mailNickname: string | null;
    membershipRule: string | null;
    membershipRuleProcessingState: string | null;
    onPremisesDomainName: string | null;
    onPremisesLastSyncDateTime: string | null;
    onPremisesNetBiosName: string | null;
    onPremisesProvisioningErrors: Array<microsoft_graph_onPremisesProvisioningError>;
    onPremisesSamAccountName: string | null;
    onPremisesSecurityIdentifier: string | null;
    onPremisesSyncEnabled: boolean | null;
    preferredDataLocation: string | null;
    preferredLanguage: string | null;
    proxyAddresses: Array<string>;
    renewedDateTime: string | null;
    securityEnabled: boolean | null;
    securityIdentifier: string | null;
    serviceProvisioningErrors: Array<microsoft_graph_serviceProvisioningError>;
    theme: string | null;
    uniqueName: string | null;
    unseenCount: number | null;
    visibility: string | null;
    acceptedSenders: Array<microsoft_graph_directoryObject>;
    appRoleAssignments: Array<microsoft_graph_appRoleAssignment>;
    calendar: (microsoft_graph_calendar | {}) | Array<microsoft_graph_calendar | {}>;
    calendarView: Array<microsoft_graph_event>;
    conversations: Array<microsoft_graph_conversation>;
    createdOnBehalfOf:
      | (microsoft_graph_directoryObject | {})
      | Array<microsoft_graph_directoryObject | {}>;
    drive: (microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>;
    drives: Array<microsoft_graph_drive>;
    events: Array<microsoft_graph_event>;
    extensions: Array<microsoft_graph_extension>;
    groupLifecyclePolicies: Array<microsoft_graph_groupLifecyclePolicy>;
    memberOf: Array<microsoft_graph_directoryObject>;
    members: Array<microsoft_graph_directoryObject>;
    membersWithLicenseErrors: Array<microsoft_graph_directoryObject>;
    onenote: (microsoft_graph_onenote | {}) | Array<microsoft_graph_onenote | {}>;
    owners: Array<microsoft_graph_directoryObject>;
    permissionGrants: Array<microsoft_graph_resourceSpecificPermissionGrant>;
    photo: (microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>;
    photos: Array<microsoft_graph_profilePhoto>;
    planner: (microsoft_graph_plannerGroup | {}) | Array<microsoft_graph_plannerGroup | {}>;
    rejectedSenders: Array<microsoft_graph_directoryObject>;
    settings: Array<microsoft_graph_groupSetting>;
    sites: Array<microsoft_graph_site>;
    team: (microsoft_graph_team | {}) | Array<microsoft_graph_team | {}>;
    threads: Array<microsoft_graph_conversationThread>;
    transitiveMemberOf: Array<microsoft_graph_directoryObject>;
    transitiveMembers: Array<microsoft_graph_directoryObject>;
  }>;
type microsoft_graph_itemActivity = microsoft_graph_entity &
  Partial<{
    access: (microsoft_graph_accessAction | {}) | Array<microsoft_graph_accessAction | {}>;
    activityDateTime: string | null;
    actor: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    driveItem: (microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>;
  }>;
type microsoft_graph_itemActivityStat = microsoft_graph_entity &
  Partial<{
    access: (microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>;
    create: (microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>;
    delete: (microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>;
    edit: (microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>;
    endDateTime: string | null;
    incompleteData:
      | (microsoft_graph_incompleteData | {})
      | Array<microsoft_graph_incompleteData | {}>;
    isTrending: boolean | null;
    move: (microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>;
    startDateTime: string | null;
    activities: Array<microsoft_graph_itemActivity>;
  }>;
type microsoft_graph_itemAnalytics = microsoft_graph_entity &
  Partial<{
    allTime: (microsoft_graph_itemActivityStat | {}) | Array<microsoft_graph_itemActivityStat | {}>;
    itemActivityStats: Array<microsoft_graph_itemActivityStat>;
    lastSevenDays:
      | (microsoft_graph_itemActivityStat | {})
      | Array<microsoft_graph_itemActivityStat | {}>;
  }>;
type microsoft_graph_list = microsoft_graph_baseItem &
  Partial<{
    displayName: string | null;
    list: (microsoft_graph_listInfo | {}) | Array<microsoft_graph_listInfo | {}>;
    sharepointIds: (microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>;
    system: (microsoft_graph_systemFacet | {}) | Array<microsoft_graph_systemFacet | {}>;
    columns: Array<microsoft_graph_columnDefinition>;
    contentTypes: Array<microsoft_graph_contentType>;
    drive: (microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>;
    items: Array<microsoft_graph_listItem>;
    operations: Array<microsoft_graph_richLongRunningOperation>;
    subscriptions: Array<microsoft_graph_subscription>;
  }>;
type microsoft_graph_listItem = microsoft_graph_baseItem &
  Partial<{
    contentType:
      | (microsoft_graph_contentTypeInfo | {})
      | Array<microsoft_graph_contentTypeInfo | {}>;
    sharepointIds: (microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>;
    analytics: (microsoft_graph_itemAnalytics | {}) | Array<microsoft_graph_itemAnalytics | {}>;
    documentSetVersions: Array<microsoft_graph_documentSetVersion>;
    driveItem: (microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>;
    fields: (microsoft_graph_fieldValueSet | {}) | Array<microsoft_graph_fieldValueSet | {}>;
    versions: Array<microsoft_graph_listItemVersion>;
  }>;
type microsoft_graph_mailFolder = microsoft_graph_entity &
  Partial<{
    childFolderCount: number | null;
    displayName: string | null;
    isHidden: boolean | null;
    parentFolderId: string | null;
    totalItemCount: number | null;
    unreadItemCount: number | null;
    childFolders: Array<microsoft_graph_mailFolder>;
    messageRules: Array<microsoft_graph_messageRule>;
    messages: Array<microsoft_graph_message>;
    multiValueExtendedProperties: Array<microsoft_graph_multiValueLegacyExtendedProperty>;
    singleValueExtendedProperties: Array<microsoft_graph_singleValueLegacyExtendedProperty>;
  }>;
type microsoft_graph_managedDevice = microsoft_graph_entity &
  Partial<{
    activationLockBypassCode: string | null;
    androidSecurityPatchLevel: string | null;
    azureADDeviceId: string | null;
    azureADRegistered: boolean | null;
    complianceGracePeriodExpirationDateTime: string;
    complianceState: microsoft_graph_complianceState;
    configurationManagerClientEnabledFeatures:
      | (microsoft_graph_configurationManagerClientEnabledFeatures | {})
      | Array<microsoft_graph_configurationManagerClientEnabledFeatures | {}>;
    deviceActionResults: Array<microsoft_graph_deviceActionResult>;
    deviceCategoryDisplayName: string | null;
    deviceEnrollmentType: microsoft_graph_deviceEnrollmentType;
    deviceHealthAttestationState:
      | (microsoft_graph_deviceHealthAttestationState | {})
      | Array<microsoft_graph_deviceHealthAttestationState | {}>;
    deviceName: string | null;
    deviceRegistrationState: microsoft_graph_deviceRegistrationState;
    easActivated: boolean;
    easActivationDateTime: string;
    easDeviceId: string | null;
    emailAddress: string | null;
    enrolledDateTime: string;
    enrollmentProfileName: string | null;
    ethernetMacAddress: string | null;
    exchangeAccessState: microsoft_graph_deviceManagementExchangeAccessState;
    exchangeAccessStateReason: microsoft_graph_deviceManagementExchangeAccessStateReason;
    exchangeLastSuccessfulSyncDateTime: string;
    freeStorageSpaceInBytes: number;
    iccid: string | null;
    imei: string | null;
    isEncrypted: boolean;
    isSupervised: boolean;
    jailBroken: string | null;
    lastSyncDateTime: string;
    managedDeviceName: string | null;
    managedDeviceOwnerType: microsoft_graph_managedDeviceOwnerType;
    managementAgent: microsoft_graph_managementAgentType;
    managementCertificateExpirationDate: string;
    manufacturer: string | null;
    meid: string | null;
    model: string | null;
    notes: string | null;
    operatingSystem: string | null;
    osVersion: string | null;
    partnerReportedThreatState: microsoft_graph_managedDevicePartnerReportedHealthState;
    phoneNumber: string | null;
    physicalMemoryInBytes: number;
    remoteAssistanceSessionErrorDetails: string | null;
    remoteAssistanceSessionUrl: string | null;
    requireUserEnrollmentApproval: boolean | null;
    serialNumber: string | null;
    subscriberCarrier: string | null;
    totalStorageSpaceInBytes: number;
    udid: string | null;
    userDisplayName: string | null;
    userId: string | null;
    userPrincipalName: string | null;
    wiFiMacAddress: string | null;
    deviceCategory:
      | (microsoft_graph_deviceCategory | {})
      | Array<microsoft_graph_deviceCategory | {}>;
    deviceCompliancePolicyStates: Array<microsoft_graph_deviceCompliancePolicyState>;
    deviceConfigurationStates: Array<microsoft_graph_deviceConfigurationState>;
    logCollectionRequests: Array<microsoft_graph_deviceLogCollectionResponse>;
    users: Array<microsoft_graph_user>;
    windowsProtectionState:
      | (microsoft_graph_windowsProtectionState | {})
      | Array<microsoft_graph_windowsProtectionState | {}>;
  }>;
type microsoft_graph_notebook = microsoft_graph_onenoteEntityHierarchyModel &
  Partial<{
    isDefault: boolean | null;
    isShared: boolean | null;
    links: (microsoft_graph_notebookLinks | {}) | Array<microsoft_graph_notebookLinks | {}>;
    sectionGroupsUrl: string | null;
    sectionsUrl: string | null;
    userRole: (microsoft_graph_onenoteUserRole | {}) | Array<microsoft_graph_onenoteUserRole | {}>;
    sectionGroups: Array<microsoft_graph_sectionGroup>;
    sections: Array<microsoft_graph_onenoteSection>;
  }>;
type microsoft_graph_onenotePage = microsoft_graph_onenoteEntitySchemaObjectModel &
  Partial<{
    content: string | null;
    contentUrl: string | null;
    createdByAppId: string | null;
    lastModifiedDateTime: string | null;
    level: number | null;
    links: (microsoft_graph_pageLinks | {}) | Array<microsoft_graph_pageLinks | {}>;
    order: number | null;
    title: string | null;
    userTags: Array<string | null>;
    parentNotebook: (microsoft_graph_notebook | {}) | Array<microsoft_graph_notebook | {}>;
    parentSection:
      | (microsoft_graph_onenoteSection | {})
      | Array<microsoft_graph_onenoteSection | {}>;
  }>;
type microsoft_graph_onenoteSection = microsoft_graph_onenoteEntityHierarchyModel &
  Partial<{
    isDefault: boolean | null;
    links: (microsoft_graph_sectionLinks | {}) | Array<microsoft_graph_sectionLinks | {}>;
    pagesUrl: string | null;
    pages: Array<microsoft_graph_onenotePage>;
    parentNotebook: (microsoft_graph_notebook | {}) | Array<microsoft_graph_notebook | {}>;
    parentSectionGroup:
      | (microsoft_graph_sectionGroup | {})
      | Array<microsoft_graph_sectionGroup | {}>;
  }>;
type microsoft_graph_post = microsoft_graph_outlookItem &
  Partial<{
    body: (microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>;
    conversationId: string | null;
    conversationThreadId: string | null;
    from: microsoft_graph_recipient;
    hasAttachments: boolean;
    newParticipants: Array<microsoft_graph_recipient>;
    receivedDateTime: string;
    sender: (microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>;
    attachments: Array<microsoft_graph_attachment>;
    extensions: Array<microsoft_graph_extension>;
    inReplyTo: (microsoft_graph_post | {}) | Array<microsoft_graph_post | {}>;
    multiValueExtendedProperties: Array<microsoft_graph_multiValueLegacyExtendedProperty>;
    singleValueExtendedProperties: Array<microsoft_graph_singleValueLegacyExtendedProperty>;
  }>;
type microsoft_graph_printer = microsoft_graph_printerBase &
  Partial<{
    hasPhysicalDevice: boolean;
    isShared: boolean;
    lastSeenDateTime: string | null;
    registeredDateTime: string;
    connectors: Array<microsoft_graph_printConnector>;
    shares: Array<microsoft_graph_printerShare>;
    taskTriggers: Array<microsoft_graph_printTaskTrigger>;
  }>;
type microsoft_graph_printerShare = microsoft_graph_printerBase &
  Partial<{
    allowAllUsers: boolean;
    createdDateTime: string;
    viewPoint:
      | (microsoft_graph_printerShareViewpoint | {})
      | Array<microsoft_graph_printerShareViewpoint | {}>;
    allowedGroups: Array<microsoft_graph_group>;
    allowedUsers: Array<microsoft_graph_user>;
    printer: (microsoft_graph_printer | {}) | Array<microsoft_graph_printer | {}>;
  }>;
type microsoft_graph_printTask = microsoft_graph_entity &
  Partial<{
    parentUrl: string;
    status: microsoft_graph_printTaskStatus;
    definition: microsoft_graph_printTaskDefinition;
    trigger: microsoft_graph_printTaskTrigger;
  }>;
type microsoft_graph_printTaskDefinition = microsoft_graph_entity &
  Partial<{
    createdBy: microsoft_graph_appIdentity;
    displayName: string;
    tasks: Array<microsoft_graph_printTask>;
  }>;
type microsoft_graph_printTaskTrigger = microsoft_graph_entity &
  Partial<{
    event: microsoft_graph_printEvent;
    definition: microsoft_graph_printTaskDefinition;
  }>;
type microsoft_graph_riskyServicePrincipal = microsoft_graph_entity &
  Partial<{
    appId: string | null;
    displayName: string | null;
    isEnabled: boolean | null;
    isProcessing: boolean | null;
    riskDetail: (microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>;
    riskLastUpdatedDateTime: string | null;
    riskLevel: (microsoft_graph_riskLevel | {}) | Array<microsoft_graph_riskLevel | {}>;
    riskState: (microsoft_graph_riskState | {}) | Array<microsoft_graph_riskState | {}>;
    servicePrincipalType: string | null;
    history: Array<microsoft_graph_riskyServicePrincipalHistoryItem>;
  }>;
type microsoft_graph_riskDetail =
  | 'none'
  | 'adminGeneratedTemporaryPassword'
  | 'userPerformedSecuredPasswordChange'
  | 'userPerformedSecuredPasswordReset'
  | 'adminConfirmedSigninSafe'
  | 'aiConfirmedSigninSafe'
  | 'userPassedMFADrivenByRiskBasedPolicy'
  | 'adminDismissedAllRiskForUser'
  | 'adminConfirmedSigninCompromised'
  | 'hidden'
  | 'adminConfirmedUserCompromised'
  | 'unknownFutureValue'
  | 'm365DAdminDismissedDetection'
  | 'adminConfirmedServicePrincipalCompromised'
  | 'adminDismissedAllRiskForServicePrincipal'
  | 'userChangedPasswordOnPremises'
  | 'adminDismissedRiskForSignIn'
  | 'adminConfirmedAccountSafe';
type microsoft_graph_riskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'hidden'
  | 'none'
  | 'unknownFutureValue';
type microsoft_graph_riskState =
  | 'none'
  | 'confirmedSafe'
  | 'remediated'
  | 'dismissed'
  | 'atRisk'
  | 'confirmedCompromised'
  | 'unknownFutureValue';
type microsoft_graph_riskServicePrincipalActivity = Partial<{
  detail: (microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>;
  riskEventTypes: Array<string | null>;
}>;
type microsoft_graph_riskyServicePrincipalHistoryItem = microsoft_graph_riskyServicePrincipal &
  Partial<{
    activity:
      | (microsoft_graph_riskServicePrincipalActivity | {})
      | Array<microsoft_graph_riskServicePrincipalActivity | {}>;
    initiatedBy: string | null;
  }>;
type microsoft_graph_riskyUser = microsoft_graph_entity &
  Partial<{
    isDeleted: boolean | null;
    isProcessing: boolean | null;
    riskDetail: (microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>;
    riskLastUpdatedDateTime: string | null;
    riskLevel: (microsoft_graph_riskLevel | {}) | Array<microsoft_graph_riskLevel | {}>;
    riskState: (microsoft_graph_riskState | {}) | Array<microsoft_graph_riskState | {}>;
    userDisplayName: string | null;
    userPrincipalName: string | null;
    history: Array<microsoft_graph_riskyUserHistoryItem>;
  }>;
type microsoft_graph_riskUserActivity = Partial<{
  detail: (microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>;
  riskEventTypes: Array<string | null>;
}>;
type microsoft_graph_riskyUserHistoryItem = microsoft_graph_riskyUser &
  Partial<{
    activity:
      | (microsoft_graph_riskUserActivity | {})
      | Array<microsoft_graph_riskUserActivity | {}>;
    initiatedBy: string | null;
    userId: string | null;
  }>;
type microsoft_graph_roleAssignment = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string | null;
    resourceScopes: Array<string | null>;
    roleDefinition:
      | (microsoft_graph_roleDefinition | {})
      | Array<microsoft_graph_roleDefinition | {}>;
  }>;
type microsoft_graph_rolePermission = Partial<{
  resourceActions: Array<microsoft_graph_resourceAction>;
}>;
type microsoft_graph_resourceAction = Partial<{
  allowedResourceActions: Array<string | null>;
  notAllowedResourceActions: Array<string | null>;
}>;
type microsoft_graph_roleDefinition = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string | null;
    isBuiltIn: boolean;
    rolePermissions: Array<microsoft_graph_rolePermission>;
    roleAssignments: Array<microsoft_graph_roleAssignment>;
  }>;
type microsoft_graph_sectionGroup = microsoft_graph_onenoteEntityHierarchyModel &
  Partial<{
    sectionGroupsUrl: string | null;
    sectionsUrl: string | null;
    parentNotebook: (microsoft_graph_notebook | {}) | Array<microsoft_graph_notebook | {}>;
    parentSectionGroup:
      | (microsoft_graph_sectionGroup | {})
      | Array<microsoft_graph_sectionGroup | {}>;
    sectionGroups: Array<microsoft_graph_sectionGroup>;
    sections: Array<microsoft_graph_onenoteSection>;
  }>;
type microsoft_graph_sharedWithChannelTeamInfo = microsoft_graph_teamInfo &
  Partial<{
    isHostTeam: boolean | null;
    allowedMembers: Array<microsoft_graph_conversationMember>;
  }>;
type microsoft_graph_site = microsoft_graph_baseItem &
  Partial<{
    displayName: string | null;
    error: (microsoft_graph_publicError | {}) | Array<microsoft_graph_publicError | {}>;
    isPersonalSite: boolean | null;
    root: (microsoft_graph_root | {}) | Array<microsoft_graph_root | {}>;
    sharepointIds: (microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>;
    siteCollection:
      | (microsoft_graph_siteCollection | {})
      | Array<microsoft_graph_siteCollection | {}>;
    analytics: (microsoft_graph_itemAnalytics | {}) | Array<microsoft_graph_itemAnalytics | {}>;
    columns: Array<microsoft_graph_columnDefinition>;
    contentTypes: Array<microsoft_graph_contentType>;
    drive: (microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>;
    drives: Array<microsoft_graph_drive>;
    externalColumns: Array<microsoft_graph_columnDefinition>;
    items: Array<microsoft_graph_baseItem>;
    lists: Array<microsoft_graph_list>;
    onenote: (microsoft_graph_onenote | {}) | Array<microsoft_graph_onenote | {}>;
    operations: Array<microsoft_graph_richLongRunningOperation>;
    pages: Array<microsoft_graph_baseSitePage>;
    permissions: Array<microsoft_graph_permission>;
    sites: Array<microsoft_graph_site>;
    termStore: (microsoft_graph_termStore_store | {}) | Array<microsoft_graph_termStore_store | {}>;
    termStores: Array<microsoft_graph_termStore_store>;
  }>;
type microsoft_graph_team = microsoft_graph_entity &
  Partial<{
    classification: string | null;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    firstChannelName: string | null;
    funSettings:
      | (microsoft_graph_teamFunSettings | {})
      | Array<microsoft_graph_teamFunSettings | {}>;
    guestSettings:
      | (microsoft_graph_teamGuestSettings | {})
      | Array<microsoft_graph_teamGuestSettings | {}>;
    internalId: string | null;
    isArchived: boolean | null;
    memberSettings:
      | (microsoft_graph_teamMemberSettings | {})
      | Array<microsoft_graph_teamMemberSettings | {}>;
    messagingSettings:
      | (microsoft_graph_teamMessagingSettings | {})
      | Array<microsoft_graph_teamMessagingSettings | {}>;
    specialization:
      | (microsoft_graph_teamSpecialization | {})
      | Array<microsoft_graph_teamSpecialization | {}>;
    summary: (microsoft_graph_teamSummary | {}) | Array<microsoft_graph_teamSummary | {}>;
    tenantId: string | null;
    visibility:
      | (microsoft_graph_teamVisibilityType | {})
      | Array<microsoft_graph_teamVisibilityType | {}>;
    webUrl: string | null;
    allChannels: Array<microsoft_graph_channel>;
    channels: Array<microsoft_graph_channel>;
    group: (microsoft_graph_group | {}) | Array<microsoft_graph_group | {}>;
    incomingChannels: Array<microsoft_graph_channel>;
    installedApps: Array<microsoft_graph_teamsAppInstallation>;
    members: Array<microsoft_graph_conversationMember>;
    operations: Array<microsoft_graph_teamsAsyncOperation>;
    permissionGrants: Array<microsoft_graph_resourceSpecificPermissionGrant>;
    photo: (microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>;
    primaryChannel: (microsoft_graph_channel | {}) | Array<microsoft_graph_channel | {}>;
    schedule: (microsoft_graph_schedule | {}) | Array<microsoft_graph_schedule | {}>;
    tags: Array<microsoft_graph_teamworkTag>;
    template: (microsoft_graph_teamsTemplate | {}) | Array<microsoft_graph_teamsTemplate | {}>;
  }>;
type microsoft_graph_teamInfo = microsoft_graph_entity &
  Partial<{
    displayName: string | null;
    tenantId: string | null;
    team: (microsoft_graph_team | {}) | Array<microsoft_graph_team | {}>;
  }>;
type microsoft_graph_termsAndConditions = microsoft_graph_entity &
  Partial<{
    acceptanceStatement: string | null;
    bodyText: string | null;
    createdDateTime: string;
    description: string | null;
    displayName: string;
    lastModifiedDateTime: string;
    title: string | null;
    version: number;
    acceptanceStatuses: Array<microsoft_graph_termsAndConditionsAcceptanceStatus>;
    assignments: Array<microsoft_graph_termsAndConditionsAssignment>;
  }>;
type microsoft_graph_termsAndConditionsAssignment = microsoft_graph_entity &
  Partial<{
    target:
      | (microsoft_graph_deviceAndAppManagementAssignmentTarget | {})
      | Array<microsoft_graph_deviceAndAppManagementAssignmentTarget | {}>;
  }>;
type microsoft_graph_deviceAndAppManagementAssignmentTarget = Partial<{}>;
type microsoft_graph_termsAndConditionsAcceptanceStatus = microsoft_graph_entity &
  Partial<{
    acceptedDateTime: string;
    acceptedVersion: number;
    userDisplayName: string | null;
    userPrincipalName: string | null;
    termsAndConditions:
      | (microsoft_graph_termsAndConditions | {})
      | Array<microsoft_graph_termsAndConditions | {}>;
  }>;
type microsoft_graph_unifiedRoleDefinition = microsoft_graph_entity &
  Partial<{
    description: string | null;
    displayName: string | null;
    isBuiltIn: boolean | null;
    isEnabled: boolean | null;
    resourceScopes: Array<string>;
    rolePermissions: Array<microsoft_graph_unifiedRolePermission>;
    templateId: string | null;
    version: string | null;
    inheritsPermissionsFrom: Array<microsoft_graph_unifiedRoleDefinition>;
  }>;
type microsoft_graph_unifiedRolePermission = Partial<{
  allowedResourceActions: Array<string>;
  condition: string | null;
  excludedResourceActions: Array<string | null>;
}>;
type microsoft_graph_user = microsoft_graph_directoryObject &
  Partial<{
    aboutMe: string | null;
    accountEnabled: boolean | null;
    ageGroup: string | null;
    assignedLicenses: Array<microsoft_graph_assignedLicense>;
    assignedPlans: Array<microsoft_graph_assignedPlan>;
    authorizationInfo:
      | (microsoft_graph_authorizationInfo | {})
      | Array<microsoft_graph_authorizationInfo | {}>;
    birthday: string;
    businessPhones: Array<string>;
    city: string | null;
    companyName: string | null;
    consentProvidedForMinor: string | null;
    country: string | null;
    createdDateTime: string | null;
    creationType: string | null;
    customSecurityAttributes:
      | (microsoft_graph_customSecurityAttributeValue | {})
      | Array<microsoft_graph_customSecurityAttributeValue | {}>;
    department: string | null;
    deviceEnrollmentLimit: number;
    displayName: string | null;
    employeeHireDate: string | null;
    employeeId: string | null;
    employeeLeaveDateTime: string | null;
    employeeOrgData:
      | (microsoft_graph_employeeOrgData | {})
      | Array<microsoft_graph_employeeOrgData | {}>;
    employeeType: string | null;
    externalUserState: string | null;
    externalUserStateChangeDateTime: string | null;
    faxNumber: string | null;
    givenName: string | null;
    hireDate: string;
    identities: Array<microsoft_graph_objectIdentity>;
    imAddresses: Array<string | null>;
    interests: Array<string | null>;
    isManagementRestricted: boolean | null;
    isResourceAccount: boolean | null;
    jobTitle: string | null;
    lastPasswordChangeDateTime: string | null;
    legalAgeGroupClassification: string | null;
    licenseAssignmentStates: Array<microsoft_graph_licenseAssignmentState>;
    mail: string | null;
    mailboxSettings:
      | (microsoft_graph_mailboxSettings | {})
      | Array<microsoft_graph_mailboxSettings | {}>;
    mailNickname: string | null;
    mobilePhone: string | null;
    mySite: string | null;
    officeLocation: string | null;
    onPremisesDistinguishedName: string | null;
    onPremisesDomainName: string | null;
    onPremisesExtensionAttributes:
      | (microsoft_graph_onPremisesExtensionAttributes | {})
      | Array<microsoft_graph_onPremisesExtensionAttributes | {}>;
    onPremisesImmutableId: string | null;
    onPremisesLastSyncDateTime: string | null;
    onPremisesProvisioningErrors: Array<microsoft_graph_onPremisesProvisioningError>;
    onPremisesSamAccountName: string | null;
    onPremisesSecurityIdentifier: string | null;
    onPremisesSyncEnabled: boolean | null;
    onPremisesUserPrincipalName: string | null;
    otherMails: Array<string>;
    passwordPolicies: string | null;
    passwordProfile:
      | (microsoft_graph_passwordProfile | {})
      | Array<microsoft_graph_passwordProfile | {}>;
    pastProjects: Array<string | null>;
    postalCode: string | null;
    preferredDataLocation: string | null;
    preferredLanguage: string | null;
    preferredName: string | null;
    print: (microsoft_graph_userPrint | {}) | Array<microsoft_graph_userPrint | {}>;
    provisionedPlans: Array<microsoft_graph_provisionedPlan>;
    proxyAddresses: Array<string>;
    responsibilities: Array<string | null>;
    schools: Array<string | null>;
    securityIdentifier: string | null;
    serviceProvisioningErrors: Array<microsoft_graph_serviceProvisioningError>;
    showInAddressList: boolean | null;
    signInActivity:
      | (microsoft_graph_signInActivity | {})
      | Array<microsoft_graph_signInActivity | {}>;
    signInSessionsValidFromDateTime: string | null;
    skills: Array<string | null>;
    state: string | null;
    streetAddress: string | null;
    surname: string | null;
    usageLocation: string | null;
    userPrincipalName: string | null;
    userType: string | null;
    activities: Array<microsoft_graph_userActivity>;
    agreementAcceptances: Array<microsoft_graph_agreementAcceptance>;
    appRoleAssignments: Array<microsoft_graph_appRoleAssignment>;
    authentication:
      | (microsoft_graph_authentication | {})
      | Array<microsoft_graph_authentication | {}>;
    calendar: (microsoft_graph_calendar | {}) | Array<microsoft_graph_calendar | {}>;
    calendarGroups: Array<microsoft_graph_calendarGroup>;
    calendars: Array<microsoft_graph_calendar>;
    calendarView: Array<microsoft_graph_event>;
    chats: Array<microsoft_graph_chat>;
    cloudClipboard:
      | (microsoft_graph_cloudClipboardRoot | {})
      | Array<microsoft_graph_cloudClipboardRoot | {}>;
    contactFolders: Array<microsoft_graph_contactFolder>;
    contacts: Array<microsoft_graph_contact>;
    createdObjects: Array<microsoft_graph_directoryObject>;
    deviceManagementTroubleshootingEvents: Array<microsoft_graph_deviceManagementTroubleshootingEvent>;
    directReports: Array<microsoft_graph_directoryObject>;
    drive: (microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>;
    drives: Array<microsoft_graph_drive>;
    employeeExperience:
      | (microsoft_graph_employeeExperienceUser | {})
      | Array<microsoft_graph_employeeExperienceUser | {}>;
    events: Array<microsoft_graph_event>;
    extensions: Array<microsoft_graph_extension>;
    followedSites: Array<microsoft_graph_site>;
    inferenceClassification:
      | (microsoft_graph_inferenceClassification | {})
      | Array<microsoft_graph_inferenceClassification | {}>;
    insights: (microsoft_graph_itemInsights | {}) | Array<microsoft_graph_itemInsights | {}>;
    joinedTeams: Array<microsoft_graph_team>;
    licenseDetails: Array<microsoft_graph_licenseDetails>;
    mailFolders: Array<microsoft_graph_mailFolder>;
    managedAppRegistrations: Array<microsoft_graph_managedAppRegistration>;
    managedDevices: Array<microsoft_graph_managedDevice>;
    manager: (microsoft_graph_directoryObject | {}) | Array<microsoft_graph_directoryObject | {}>;
    memberOf: Array<microsoft_graph_directoryObject>;
    messages: Array<microsoft_graph_message>;
    oauth2PermissionGrants: Array<microsoft_graph_oAuth2PermissionGrant>;
    onenote: (microsoft_graph_onenote | {}) | Array<microsoft_graph_onenote | {}>;
    onlineMeetings: Array<microsoft_graph_onlineMeeting>;
    outlook: (microsoft_graph_outlookUser | {}) | Array<microsoft_graph_outlookUser | {}>;
    ownedDevices: Array<microsoft_graph_directoryObject>;
    ownedObjects: Array<microsoft_graph_directoryObject>;
    people: Array<microsoft_graph_person>;
    permissionGrants: Array<microsoft_graph_resourceSpecificPermissionGrant>;
    photo: (microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>;
    photos: Array<microsoft_graph_profilePhoto>;
    planner: (microsoft_graph_plannerUser | {}) | Array<microsoft_graph_plannerUser | {}>;
    presence: (microsoft_graph_presence | {}) | Array<microsoft_graph_presence | {}>;
    registeredDevices: Array<microsoft_graph_directoryObject>;
    scopedRoleMemberOf: Array<microsoft_graph_scopedRoleMembership>;
    settings: (microsoft_graph_userSettings | {}) | Array<microsoft_graph_userSettings | {}>;
    solutions:
      | (microsoft_graph_userSolutionRoot | {})
      | Array<microsoft_graph_userSolutionRoot | {}>;
    sponsors: Array<microsoft_graph_directoryObject>;
    teamwork: (microsoft_graph_userTeamwork | {}) | Array<microsoft_graph_userTeamwork | {}>;
    todo: (microsoft_graph_todo | {}) | Array<microsoft_graph_todo | {}>;
    transitiveMemberOf: Array<microsoft_graph_directoryObject>;
  }>;
type microsoft_graph_userActivity = microsoft_graph_entity &
  Partial<{
    activationUrl: string;
    activitySourceHost: string;
    appActivityId: string;
    appDisplayName: string | null;
    contentInfo: unknown;
    contentUrl: string | null;
    createdDateTime: string | null;
    expirationDateTime: string | null;
    fallbackUrl: string | null;
    lastModifiedDateTime: string | null;
    status: (microsoft_graph_status | {}) | Array<microsoft_graph_status | {}>;
    userTimezone: string | null;
    visualElements: microsoft_graph_visualInfo;
    historyItems: Array<microsoft_graph_activityHistoryItem>;
  }>;
type microsoft_graph_userTeamwork = microsoft_graph_entity &
  Partial<{
    locale: string | null;
    region: string | null;
    associatedTeams: Array<microsoft_graph_associatedTeamInfo>;
    installedApps: Array<microsoft_graph_userScopeTeamsAppInstallation>;
  }>;
type microsoft_graph_workbookChart = microsoft_graph_entity &
  Partial<{
    height: (number | null) | (string | null) | ReferenceNumeric;
    left: (number | null) | (string | null) | ReferenceNumeric;
    name: string | null;
    top: (number | null) | (string | null) | ReferenceNumeric;
    width: (number | null) | (string | null) | ReferenceNumeric;
    axes: (microsoft_graph_workbookChartAxes | {}) | Array<microsoft_graph_workbookChartAxes | {}>;
    dataLabels:
      | (microsoft_graph_workbookChartDataLabels | {})
      | Array<microsoft_graph_workbookChartDataLabels | {}>;
    format:
      | (microsoft_graph_workbookChartAreaFormat | {})
      | Array<microsoft_graph_workbookChartAreaFormat | {}>;
    legend:
      | (microsoft_graph_workbookChartLegend | {})
      | Array<microsoft_graph_workbookChartLegend | {}>;
    series: Array<microsoft_graph_workbookChartSeries>;
    title:
      | (microsoft_graph_workbookChartTitle | {})
      | Array<microsoft_graph_workbookChartTitle | {}>;
    worksheet:
      | (microsoft_graph_workbookWorksheet | {})
      | Array<microsoft_graph_workbookWorksheet | {}>;
  }>;
type microsoft_graph_workbookNamedItem = microsoft_graph_entity &
  Partial<{
    comment: string | null;
    name: string | null;
    scope: string;
    type: string | null;
    value: unknown;
    visible: boolean;
    worksheet:
      | (microsoft_graph_workbookWorksheet | {})
      | Array<microsoft_graph_workbookWorksheet | {}>;
  }>;
type microsoft_graph_workbookPivotTable = microsoft_graph_entity &
  Partial<{
    name: string | null;
    worksheet:
      | (microsoft_graph_workbookWorksheet | {})
      | Array<microsoft_graph_workbookWorksheet | {}>;
  }>;
type microsoft_graph_workbookRangeView = microsoft_graph_entity &
  Partial<{
    cellAddresses: unknown;
    columnCount: number;
    formulas: unknown;
    formulasLocal: unknown;
    formulasR1C1: unknown;
    index: number;
    numberFormat: unknown;
    rowCount: number;
    text: unknown;
    values: unknown;
    valueTypes: unknown;
    rows: Array<microsoft_graph_workbookRangeView>;
  }>;
type microsoft_graph_workbookTable = microsoft_graph_entity &
  Partial<{
    highlightFirstColumn: boolean;
    highlightLastColumn: boolean;
    legacyId: string | null;
    name: string | null;
    showBandedColumns: boolean;
    showBandedRows: boolean;
    showFilterButton: boolean;
    showHeaders: boolean;
    showTotals: boolean;
    style: string | null;
    columns: Array<microsoft_graph_workbookTableColumn>;
    rows: Array<microsoft_graph_workbookTableRow>;
    sort: (microsoft_graph_workbookTableSort | {}) | Array<microsoft_graph_workbookTableSort | {}>;
    worksheet:
      | (microsoft_graph_workbookWorksheet | {})
      | Array<microsoft_graph_workbookWorksheet | {}>;
  }>;
type microsoft_graph_workbookWorksheet = microsoft_graph_entity &
  Partial<{
    name: string | null;
    position: number;
    visibility: string;
    charts: Array<microsoft_graph_workbookChart>;
    names: Array<microsoft_graph_workbookNamedItem>;
    pivotTables: Array<microsoft_graph_workbookPivotTable>;
    protection:
      | (microsoft_graph_workbookWorksheetProtection | {})
      | Array<microsoft_graph_workbookWorksheetProtection | {}>;
    tables: Array<microsoft_graph_workbookTable>;
  }>;
type microsoft_graph_attributeMappingSource = Partial<{
  expression: string | null;
  name: string | null;
  parameters: Array<microsoft_graph_stringKeyAttributeMappingSourceValuePair>;
  type: microsoft_graph_attributeMappingSourceType;
}>;
type microsoft_graph_attributeMappingSourceType = 'Attribute' | 'Constant' | 'Function';
type microsoft_graph_stringKeyAttributeMappingSourceValuePair = Partial<{
  key: string | null;
  value:
    | (microsoft_graph_attributeMappingSource | {})
    | Array<microsoft_graph_attributeMappingSource | {}>;
}>;
type microsoft_graph_synchronizationJobSubject = Partial<{
  links:
    | (microsoft_graph_synchronizationLinkedObjects | {})
    | Array<microsoft_graph_synchronizationLinkedObjects | {}>;
  objectId: string | null;
  objectTypeName: string | null;
}>;
type microsoft_graph_synchronizationLinkedObjects = Partial<{
  manager:
    | (microsoft_graph_synchronizationJobSubject | {})
    | Array<microsoft_graph_synchronizationJobSubject | {}>;
  members: Array<microsoft_graph_synchronizationJobSubject>;
  owners: Array<microsoft_graph_synchronizationJobSubject>;
}>;
type microsoft_graph_userPrint = Partial<{
  recentPrinterShares: Array<microsoft_graph_printerShare>;
}>;
type microsoft_graph_workbookOperationError = Partial<{
  code: string | null;
  innerError:
    | (microsoft_graph_workbookOperationError | {})
    | Array<microsoft_graph_workbookOperationError | {}>;
  message: string | null;
}>;
type microsoft_graph_identityGovernance_task = microsoft_graph_entity &
  Partial<{
    arguments: Array<microsoft_graph_keyValuePair>;
    category: microsoft_graph_identityGovernance_lifecycleTaskCategory;
    continueOnError: boolean;
    description: string | null;
    displayName: string;
    executionSequence: number;
    isEnabled: boolean;
    taskDefinitionId: string;
    taskProcessingResults: Array<microsoft_graph_identityGovernance_taskProcessingResult>;
  }>;
type microsoft_graph_keyValuePair = Partial<{
  name: string;
  value: string | null;
}>;
type microsoft_graph_identityGovernance_lifecycleTaskCategory =
  | 'joiner'
  | 'leaver'
  | 'unknownFutureValue'
  | 'mover';
type microsoft_graph_identityGovernance_lifecycleWorkflowProcessingStatus =
  | 'queued'
  | 'inProgress'
  | 'completed'
  | 'completedWithErrors'
  | 'canceled'
  | 'failed'
  | 'unknownFutureValue';
type microsoft_graph_identityGovernance_taskProcessingResult = microsoft_graph_entity &
  Partial<{
    completedDateTime: string | null;
    createdDateTime: string;
    failureReason: string | null;
    processingStatus: microsoft_graph_identityGovernance_lifecycleWorkflowProcessingStatus;
    startedDateTime: string | null;
    subject: microsoft_graph_user;
    task: microsoft_graph_identityGovernance_task;
  }>;
type microsoft_graph_security_ediscoveryAddToReviewSetOperation =
  microsoft_graph_security_caseOperation &
    Partial<{
      additionalDataOptions:
        | (microsoft_graph_security_additionalDataOptions | {})
        | Array<microsoft_graph_security_additionalDataOptions | {}>;
      cloudAttachmentVersion:
        | (microsoft_graph_security_cloudAttachmentVersion | {})
        | Array<microsoft_graph_security_cloudAttachmentVersion | {}>;
      documentVersion:
        | (microsoft_graph_security_documentVersion | {})
        | Array<microsoft_graph_security_documentVersion | {}>;
      itemsToInclude:
        | (microsoft_graph_security_itemsToInclude | {})
        | Array<microsoft_graph_security_itemsToInclude | {}>;
      reviewSet:
        | (microsoft_graph_security_ediscoveryReviewSet | {})
        | Array<microsoft_graph_security_ediscoveryReviewSet | {}>;
      search:
        | (microsoft_graph_security_ediscoverySearch | {})
        | Array<microsoft_graph_security_ediscoverySearch | {}>;
    }>;
type microsoft_graph_security_caseOperation = microsoft_graph_entity &
  Partial<{
    action:
      | (microsoft_graph_security_caseAction | {})
      | Array<microsoft_graph_security_caseAction | {}>;
    completedDateTime: string | null;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    percentProgress: number | null;
    resultInfo: (microsoft_graph_resultInfo | {}) | Array<microsoft_graph_resultInfo | {}>;
    status:
      | (microsoft_graph_security_caseOperationStatus | {})
      | Array<microsoft_graph_security_caseOperationStatus | {}>;
  }>;
type microsoft_graph_security_caseAction =
  | 'contentExport'
  | 'applyTags'
  | 'convertToPdf'
  | 'index'
  | 'estimateStatistics'
  | 'addToReviewSet'
  | 'holdUpdate'
  | 'unknownFutureValue'
  | 'purgeData'
  | 'exportReport'
  | 'exportResult';
type microsoft_graph_resultInfo = Partial<{
  code: number;
  message: string | null;
  subcode: number;
}>;
type microsoft_graph_security_caseOperationStatus =
  | 'notStarted'
  | 'submissionFailed'
  | 'running'
  | 'succeeded'
  | 'partiallySucceeded'
  | 'failed'
  | 'unknownFutureValue';
type microsoft_graph_security_additionalDataOptions =
  | 'allVersions'
  | 'linkedFiles'
  | 'unknownFutureValue'
  | 'advancedIndexing'
  | 'listAttachments'
  | 'htmlTranscripts'
  | 'messageConversationExpansion'
  | 'locationsWithoutHits'
  | 'allItemsInFolder';
type microsoft_graph_security_cloudAttachmentVersion =
  | 'latest'
  | 'recent10'
  | 'recent100'
  | 'all'
  | 'unknownFutureValue';
type microsoft_graph_security_documentVersion =
  | 'latest'
  | 'recent10'
  | 'recent100'
  | 'all'
  | 'unknownFutureValue';
type microsoft_graph_security_itemsToInclude =
  | 'searchHits'
  | 'partiallyIndexed'
  | 'unknownFutureValue';
type microsoft_graph_security_ediscoveryReviewSet = microsoft_graph_security_dataSet &
  Partial<{
    queries: Array<microsoft_graph_security_ediscoveryReviewSetQuery>;
  }>;
type microsoft_graph_security_dataSet = microsoft_graph_entity &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
  }>;
type microsoft_graph_security_ediscoveryReviewSetQuery = microsoft_graph_security_search &
  Partial<{}>;
type microsoft_graph_security_search = microsoft_graph_entity &
  Partial<{
    contentQuery: string | null;
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    lastModifiedBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    lastModifiedDateTime: string | null;
  }>;
type microsoft_graph_security_dataSourceScopes =
  | 'none'
  | 'allTenantMailboxes'
  | 'allTenantSites'
  | 'allCaseCustodians'
  | 'allCaseNoncustodialDataSources'
  | 'unknownFutureValue';
type microsoft_graph_security_dataSource = microsoft_graph_entity &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    createdDateTime: string | null;
    displayName: string | null;
    holdStatus:
      | (microsoft_graph_security_dataSourceHoldStatus | {})
      | Array<microsoft_graph_security_dataSourceHoldStatus | {}>;
  }>;
type microsoft_graph_security_dataSourceHoldStatus =
  | 'notApplied'
  | 'applied'
  | 'applying'
  | 'removing'
  | 'partial'
  | 'unknownFutureValue';
type microsoft_graph_security_statisticsOptions =
  | 'includeRefiners'
  | 'includeQueryStats'
  | 'includeUnindexedStats'
  | 'advancedIndexing'
  | 'locationsWithoutHits'
  | 'unknownFutureValue';
type microsoft_graph_security_ediscoveryNoncustodialDataSource =
  microsoft_graph_security_dataSourceContainer &
    Partial<{
      dataSource:
        | (microsoft_graph_security_dataSource | {})
        | Array<microsoft_graph_security_dataSource | {}>;
      lastIndexOperation:
        | (microsoft_graph_security_ediscoveryIndexOperation | {})
        | Array<microsoft_graph_security_ediscoveryIndexOperation | {}>;
    }>;
type microsoft_graph_security_dataSourceContainer = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    displayName: string | null;
    holdStatus:
      | (microsoft_graph_security_dataSourceHoldStatus | {})
      | Array<microsoft_graph_security_dataSourceHoldStatus | {}>;
    lastModifiedDateTime: string | null;
    releasedDateTime: string | null;
    status:
      | (microsoft_graph_security_dataSourceContainerStatus | {})
      | Array<microsoft_graph_security_dataSourceContainerStatus | {}>;
  }>;
type microsoft_graph_security_dataSourceContainerStatus =
  | 'active'
  | 'released'
  | 'unknownFutureValue';
type microsoft_graph_security_ediscoveryIndexOperation = microsoft_graph_security_caseOperation &
  Partial<{}>;
type microsoft_graph_security_ediscoveryEstimateOperation = microsoft_graph_security_caseOperation &
  Partial<{
    indexedItemCount: number | null;
    indexedItemsSize: number | null;
    mailboxCount: number | null;
    siteCount: number | null;
    statisticsOptions:
      | (microsoft_graph_security_statisticsOptions | {})
      | Array<microsoft_graph_security_statisticsOptions | {}>;
    unindexedItemCount: number | null;
    unindexedItemsSize: number | null;
    search:
      | (microsoft_graph_security_ediscoverySearch | {})
      | Array<microsoft_graph_security_ediscoverySearch | {}>;
  }>;
type microsoft_graph_security_ediscoveryReviewTag = microsoft_graph_security_tag &
  Partial<{
    childSelectability:
      | (microsoft_graph_security_childSelectability | {})
      | Array<microsoft_graph_security_childSelectability | {}>;
    childTags: Array<microsoft_graph_security_ediscoveryReviewTag>;
    parent:
      | (microsoft_graph_security_ediscoveryReviewTag | {})
      | Array<microsoft_graph_security_ediscoveryReviewTag | {}>;
  }>;
type microsoft_graph_security_tag = microsoft_graph_entity &
  Partial<{
    createdBy: (microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>;
    description: string | null;
    displayName: string | null;
    lastModifiedDateTime: string | null;
  }>;
type microsoft_graph_security_childSelectability = 'One' | 'Many' | 'unknownFutureValue';
type microsoft_graph_security_ediscoverySearch = microsoft_graph_security_search &
  Partial<{
    dataSourceScopes:
      | (microsoft_graph_security_dataSourceScopes | {})
      | Array<microsoft_graph_security_dataSourceScopes | {}>;
    additionalSources: Array<microsoft_graph_security_dataSource>;
    addToReviewSetOperation:
      | (microsoft_graph_security_ediscoveryAddToReviewSetOperation | {})
      | Array<microsoft_graph_security_ediscoveryAddToReviewSetOperation | {}>;
    custodianSources: Array<microsoft_graph_security_dataSource>;
    lastEstimateStatisticsOperation:
      | (microsoft_graph_security_ediscoveryEstimateOperation | {})
      | Array<microsoft_graph_security_ediscoveryEstimateOperation | {}>;
    noncustodialSources: Array<microsoft_graph_security_ediscoveryNoncustodialDataSource>;
  }>;
type microsoft_graph_security_host = microsoft_graph_security_artifact &
  Partial<{
    firstSeenDateTime: string | null;
    lastSeenDateTime: string | null;
    childHostPairs: Array<microsoft_graph_security_hostPair>;
    components: Array<microsoft_graph_security_hostComponent>;
    cookies: Array<microsoft_graph_security_hostCookie>;
    hostPairs: Array<microsoft_graph_security_hostPair>;
    parentHostPairs: Array<microsoft_graph_security_hostPair>;
    passiveDns: Array<microsoft_graph_security_passiveDnsRecord>;
    passiveDnsReverse: Array<microsoft_graph_security_passiveDnsRecord>;
    ports: Array<microsoft_graph_security_hostPort>;
    reputation:
      | (microsoft_graph_security_hostReputation | {})
      | Array<microsoft_graph_security_hostReputation | {}>;
    sslCertificates: Array<microsoft_graph_security_hostSslCertificate>;
    subdomains: Array<microsoft_graph_security_subdomain>;
    trackers: Array<microsoft_graph_security_hostTracker>;
    whois:
      | (microsoft_graph_security_whoisRecord | {})
      | Array<microsoft_graph_security_whoisRecord | {}>;
  }>;
type microsoft_graph_security_artifact = microsoft_graph_entity & Partial<{}>;
type microsoft_graph_security_hostPortBanner = Partial<{
  banner: string;
  firstSeenDateTime: string | null;
  lastSeenDateTime: string | null;
  scanProtocol: string | null;
  timesObserved: number | null;
}>;
type microsoft_graph_security_hostPortProtocol = 'tcp' | 'udp' | 'unknownFutureValue';
type microsoft_graph_security_hostPortStatus =
  | 'open'
  | 'filtered'
  | 'closed'
  | 'unknownFutureValue';
type microsoft_graph_security_sslCertificateEntity = Partial<{
  address: (microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>;
  alternateNames: Array<string | null>;
  commonName: string | null;
  email: string | null;
  givenName: string | null;
  organizationName: string | null;
  organizationUnitName: string | null;
  serialNumber: string | null;
  surname: string | null;
}>;
type microsoft_graph_security_hostReputation = microsoft_graph_entity &
  Partial<{
    classification: microsoft_graph_security_hostReputationClassification;
    rules: Array<microsoft_graph_security_hostReputationRule>;
    score: number;
  }>;
type microsoft_graph_security_hostReputationClassification =
  | 'unknown'
  | 'neutral'
  | 'suspicious'
  | 'malicious'
  | 'unknownFutureValue';
type microsoft_graph_security_hostReputationRule = Partial<{
  description: string;
  name: string;
  relatedDetailsUrl: string | null;
  severity: microsoft_graph_security_hostReputationRuleSeverity;
}>;
type microsoft_graph_security_hostReputationRuleSeverity =
  | 'unknown'
  | 'low'
  | 'medium'
  | 'high'
  | 'unknownFutureValue';
type microsoft_graph_security_hostSslCertificatePort = Partial<{
  firstSeenDateTime: string | null;
  lastSeenDateTime: string | null;
  port: number | null;
}>;
type microsoft_graph_security_whoisContact = Partial<{
  address: (microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>;
  email: string | null;
  fax: string | null;
  name: string | null;
  organization: string | null;
  telephone: string | null;
}>;
type microsoft_graph_security_hostComponent = microsoft_graph_security_artifact &
  Partial<{
    category: string | null;
    firstSeenDateTime: string;
    lastSeenDateTime: string;
    name: string;
    version: string | null;
    host: microsoft_graph_security_host;
  }>;
type microsoft_graph_security_hostCookie = microsoft_graph_security_artifact &
  Partial<{
    domain: string;
    firstSeenDateTime: string;
    lastSeenDateTime: string;
    name: string;
    host: microsoft_graph_security_host;
  }>;
type microsoft_graph_security_hostPair = microsoft_graph_entity &
  Partial<{
    firstSeenDateTime: string | null;
    lastSeenDateTime: string | null;
    linkKind: string | null;
    childHost: microsoft_graph_security_host;
    parentHost: microsoft_graph_security_host;
  }>;
type microsoft_graph_security_hostPort = microsoft_graph_entity &
  Partial<{
    banners: Array<microsoft_graph_security_hostPortBanner>;
    firstSeenDateTime: string | null;
    lastScanDateTime: string | null;
    lastSeenDateTime: string | null;
    port: number;
    protocol:
      | (microsoft_graph_security_hostPortProtocol | {})
      | Array<microsoft_graph_security_hostPortProtocol | {}>;
    services: Array<microsoft_graph_security_hostPortComponent>;
    status:
      | (microsoft_graph_security_hostPortStatus | {})
      | Array<microsoft_graph_security_hostPortStatus | {}>;
    timesObserved: number | null;
    host: microsoft_graph_security_host;
    mostRecentSslCertificate:
      | (microsoft_graph_security_sslCertificate | {})
      | Array<microsoft_graph_security_sslCertificate | {}>;
  }>;
type microsoft_graph_security_hostSslCertificate = microsoft_graph_security_artifact &
  Partial<{
    firstSeenDateTime: string | null;
    lastSeenDateTime: string | null;
    ports: Array<microsoft_graph_security_hostSslCertificatePort>;
    host: (microsoft_graph_security_host | {}) | Array<microsoft_graph_security_host | {}>;
    sslCertificate:
      | (microsoft_graph_security_sslCertificate | {})
      | Array<microsoft_graph_security_sslCertificate | {}>;
  }>;
type microsoft_graph_security_hostTracker = microsoft_graph_security_artifact &
  Partial<{
    firstSeenDateTime: string;
    kind: string;
    lastSeenDateTime: string;
    value: string;
    host: microsoft_graph_security_host;
  }>;
type microsoft_graph_security_passiveDnsRecord = microsoft_graph_security_artifact &
  Partial<{
    collectedDateTime: string;
    firstSeenDateTime: string;
    lastSeenDateTime: string;
    recordType: string;
    artifact: microsoft_graph_security_artifact;
    parentHost: microsoft_graph_security_host;
  }>;
type microsoft_graph_security_sslCertificate = microsoft_graph_security_artifact &
  Partial<{
    expirationDateTime: string | null;
    fingerprint: string | null;
    firstSeenDateTime: string | null;
    issueDateTime: string | null;
    issuer:
      | (microsoft_graph_security_sslCertificateEntity | {})
      | Array<microsoft_graph_security_sslCertificateEntity | {}>;
    lastSeenDateTime: string | null;
    serialNumber: string | null;
    sha1: string | null;
    subject:
      | (microsoft_graph_security_sslCertificateEntity | {})
      | Array<microsoft_graph_security_sslCertificateEntity | {}>;
    relatedHosts: Array<microsoft_graph_security_host>;
  }>;
type microsoft_graph_security_subdomain = microsoft_graph_entity &
  Partial<{
    firstSeenDateTime: string | null;
    host: microsoft_graph_security_host;
  }>;
type microsoft_graph_security_whoisBaseRecord = microsoft_graph_entity &
  Partial<{
    abuse:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    admin:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    billing:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    domainStatus: string | null;
    expirationDateTime: string | null;
    firstSeenDateTime: string | null;
    lastSeenDateTime: string | null;
    lastUpdateDateTime: string | null;
    nameservers: Array<microsoft_graph_security_whoisNameserver>;
    noc:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    rawWhoisText: string | null;
    registrant:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    registrar:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    registrationDateTime: string | null;
    technical:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    whoisServer: string | null;
    zone:
      | (microsoft_graph_security_whoisContact | {})
      | Array<microsoft_graph_security_whoisContact | {}>;
    host: microsoft_graph_security_host;
  }>;
type microsoft_graph_security_whoisHistoryRecord = microsoft_graph_security_whoisBaseRecord &
  Partial<{}>;
type microsoft_graph_security_whoisRecord = microsoft_graph_security_whoisBaseRecord &
  Partial<{
    history: Array<microsoft_graph_security_whoisHistoryRecord>;
  }>;
type microsoft_graph_security_containerEvidence = microsoft_graph_security_alertEvidence &
  Partial<{
    args: Array<string | null>;
    command: Array<string | null>;
    containerId: string | null;
    image:
      | (microsoft_graph_security_containerImageEvidence | {})
      | Array<microsoft_graph_security_containerImageEvidence | {}>;
    isPrivileged: boolean;
    name: string | null;
    pod:
      | (microsoft_graph_security_kubernetesPodEvidence | {})
      | Array<microsoft_graph_security_kubernetesPodEvidence | {}>;
  }>;
type microsoft_graph_security_alertEvidence = Partial<{
  createdDateTime: string;
  detailedRoles: Array<string | null>;
  remediationStatus: microsoft_graph_security_evidenceRemediationStatus;
  remediationStatusDetails: string | null;
  roles: Array<microsoft_graph_security_evidenceRole>;
  tags: Array<string | null>;
  verdict: microsoft_graph_security_evidenceVerdict;
}>;
type microsoft_graph_security_evidenceRemediationStatus =
  | 'none'
  | 'remediated'
  | 'prevented'
  | 'blocked'
  | 'notFound'
  | 'unknownFutureValue'
  | 'active'
  | 'pendingApproval'
  | 'declined'
  | 'unremediated'
  | 'running'
  | 'partiallyRemediated';
type microsoft_graph_security_evidenceRole =
  | 'unknown'
  | 'contextual'
  | 'scanned'
  | 'source'
  | 'destination'
  | 'created'
  | 'added'
  | 'compromised'
  | 'edited'
  | 'attacked'
  | 'attacker'
  | 'commandAndControl'
  | 'loaded'
  | 'suspicious'
  | 'policyViolator'
  | 'unknownFutureValue';
type microsoft_graph_security_evidenceVerdict =
  | 'unknown'
  | 'suspicious'
  | 'malicious'
  | 'noThreatsFound'
  | 'unknownFutureValue';
type microsoft_graph_security_containerRegistryEvidence = microsoft_graph_security_alertEvidence &
  Partial<{
    registry: string | null;
  }>;
type microsoft_graph_security_kubernetesControllerEvidence =
  microsoft_graph_security_alertEvidence &
    Partial<{
      labels:
        | (microsoft_graph_security_dictionary | {})
        | Array<microsoft_graph_security_dictionary | {}>;
      name: string | null;
      namespace:
        | (microsoft_graph_security_kubernetesNamespaceEvidence | {})
        | Array<microsoft_graph_security_kubernetesNamespaceEvidence | {}>;
      type: string | null;
    }>;
type microsoft_graph_security_dictionary = Partial<{}>;
type microsoft_graph_security_kubernetesNamespaceEvidence = microsoft_graph_security_alertEvidence &
  Partial<{
    cluster:
      | (microsoft_graph_security_kubernetesClusterEvidence | {})
      | Array<microsoft_graph_security_kubernetesClusterEvidence | {}>;
    labels:
      | (microsoft_graph_security_dictionary | {})
      | Array<microsoft_graph_security_dictionary | {}>;
    name: string | null;
  }>;
type microsoft_graph_security_kubernetesClusterEvidence = microsoft_graph_security_alertEvidence &
  Partial<{
    cloudResource:
      | (microsoft_graph_security_alertEvidence | {})
      | Array<microsoft_graph_security_alertEvidence | {}>;
    distribution: string | null;
    name: string | null;
    platform:
      | (microsoft_graph_security_kubernetesPlatform | {})
      | Array<microsoft_graph_security_kubernetesPlatform | {}>;
    version: string | null;
  }>;
type microsoft_graph_security_kubernetesPlatform =
  | 'unknown'
  | 'aks'
  | 'eks'
  | 'gke'
  | 'arc'
  | 'unknownFutureValue';
type microsoft_graph_security_ipEvidence = microsoft_graph_security_alertEvidence &
  Partial<{
    countryLetterCode: string | null;
    ipAddress: string | null;
    location:
      | (microsoft_graph_security_geoLocation | {})
      | Array<microsoft_graph_security_geoLocation | {}>;
    stream: (microsoft_graph_security_stream | {}) | Array<microsoft_graph_security_stream | {}>;
  }>;
type microsoft_graph_security_geoLocation = Partial<{
  city: string | null;
  countryName: string | null;
  latitude: (number | null) | (string | null) | ReferenceNumeric;
  longitude: (number | null) | (string | null) | ReferenceNumeric;
  state: string | null;
}>;
type microsoft_graph_security_stream = Partial<{
  name: string | null;
}>;
type microsoft_graph_security_kubernetesServiceAccountEvidence =
  microsoft_graph_security_alertEvidence &
    Partial<{
      name: string | null;
      namespace:
        | (microsoft_graph_security_kubernetesNamespaceEvidence | {})
        | Array<microsoft_graph_security_kubernetesNamespaceEvidence | {}>;
    }>;
type microsoft_graph_security_containerImageEvidence = microsoft_graph_security_alertEvidence &
  Partial<{
    digestImage:
      | (microsoft_graph_security_containerImageEvidence | {})
      | Array<microsoft_graph_security_containerImageEvidence | {}>;
    imageId: string | null;
    registry:
      | (microsoft_graph_security_containerRegistryEvidence | {})
      | Array<microsoft_graph_security_containerRegistryEvidence | {}>;
  }>;
type microsoft_graph_security_hostPortComponent = Partial<{
  firstSeenDateTime: string | null;
  isRecent: boolean | null;
  lastSeenDateTime: string | null;
  component:
    | (microsoft_graph_security_hostComponent | {})
    | Array<microsoft_graph_security_hostComponent | {}>;
}>;
type microsoft_graph_security_kubernetesPodEvidence = microsoft_graph_security_alertEvidence &
  Partial<{
    containers: Array<microsoft_graph_security_containerEvidence>;
    controller:
      | (microsoft_graph_security_kubernetesControllerEvidence | {})
      | Array<microsoft_graph_security_kubernetesControllerEvidence | {}>;
    ephemeralContainers: Array<microsoft_graph_security_containerEvidence>;
    initContainers: Array<microsoft_graph_security_containerEvidence>;
    labels:
      | (microsoft_graph_security_dictionary | {})
      | Array<microsoft_graph_security_dictionary | {}>;
    name: string | null;
    namespace:
      | (microsoft_graph_security_kubernetesNamespaceEvidence | {})
      | Array<microsoft_graph_security_kubernetesNamespaceEvidence | {}>;
    podIp:
      | (microsoft_graph_security_ipEvidence | {})
      | Array<microsoft_graph_security_ipEvidence | {}>;
    serviceAccount:
      | (microsoft_graph_security_kubernetesServiceAccountEvidence | {})
      | Array<microsoft_graph_security_kubernetesServiceAccountEvidence | {}>;
  }>;
type microsoft_graph_security_whoisNameserver = Partial<{
  firstSeenDateTime: string | null;
  lastSeenDateTime: string | null;
  host: microsoft_graph_security_host;
}>;
type microsoft_graph_termStore_group = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    description: string | null;
    displayName: string | null;
    parentSiteId: string | null;
    scope:
      | (microsoft_graph_termStore_termGroupScope | {})
      | Array<microsoft_graph_termStore_termGroupScope | {}>;
    sets: Array<microsoft_graph_termStore_set>;
  }>;
type microsoft_graph_termStore_relation = microsoft_graph_entity &
  Partial<{
    relationship:
      | (microsoft_graph_termStore_relationType | {})
      | Array<microsoft_graph_termStore_relationType | {}>;
    fromTerm: (microsoft_graph_termStore_term | {}) | Array<microsoft_graph_termStore_term | {}>;
    set: (microsoft_graph_termStore_set | {}) | Array<microsoft_graph_termStore_set | {}>;
    toTerm: (microsoft_graph_termStore_term | {}) | Array<microsoft_graph_termStore_term | {}>;
  }>;
type microsoft_graph_termStore_set = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    description: string | null;
    localizedNames: Array<microsoft_graph_termStore_localizedName>;
    properties: Array<microsoft_graph_keyValue>;
    children: Array<microsoft_graph_termStore_term>;
    parentGroup: microsoft_graph_termStore_group;
    relations: Array<microsoft_graph_termStore_relation>;
    terms: Array<microsoft_graph_termStore_term>;
  }>;
type microsoft_graph_termStore_term = microsoft_graph_entity &
  Partial<{
    createdDateTime: string | null;
    descriptions: Array<microsoft_graph_termStore_localizedDescription>;
    labels: Array<microsoft_graph_termStore_localizedLabel>;
    lastModifiedDateTime: string | null;
    properties: Array<microsoft_graph_keyValue>;
    children: Array<microsoft_graph_termStore_term>;
    relations: Array<microsoft_graph_termStore_relation>;
    set: (microsoft_graph_termStore_set | {}) | Array<microsoft_graph_termStore_set | {}>;
  }>;

const microsoft_graph_ODataErrors_ErrorDetails = z
  .object({ code: z.string(), message: z.string(), target: z.string().nullish() })
  .strict();
const microsoft_graph_ODataErrors_InnerError = z
  .object({
    'request-id': z.string().describe('Request Id as tracked internally by the service').nullable(),
    'client-request-id': z
      .string()
      .describe('Client request Id as sent by the client application.')
      .nullable(),
    date: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date when the error occured.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_ODataErrors_MainError = z
  .object({
    code: z.string(),
    message: z.string(),
    target: z.string().nullish(),
    details: z.array(microsoft_graph_ODataErrors_ErrorDetails).optional(),
    innerError: microsoft_graph_ODataErrors_InnerError.optional(),
  })
  .strict();
const microsoft_graph_ODataErrors_ODataError = z
  .object({ error: microsoft_graph_ODataErrors_MainError })
  .strict();
const BaseCollectionPaginationCountResponse = z
  .object({ '@odata.count': z.number().int().nullable(), '@odata.nextLink': z.string().nullable() })
  .partial()
  .strict();
const microsoft_graph_entity = z
  .object({ id: z.string().describe('The unique identifier for an entity. Read-only.') })
  .partial()
  .strict();
const microsoft_graph_identity = z
  .object({
    displayName: z
      .string()
      .describe(
        "The display name of the identity.For drive items, the display name might not always be available or up to date. For example, if a user changes their display name the API might show the new value in a future response, but the items associated with the user don't show up as changed when using delta."
      )
      .nullable(),
    id: z
      .string()
      .describe(
        "Unique identifier for the identity or actor. For example, in the access reviews decisions API, this property might record the id of the principal, that is, the group, user, or application that's subject to review."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_identitySet = z
  .object({
    application: z
      .union([microsoft_graph_identity, z.object({}).partial().strict()])
      .describe('Optional. The application associated with this action.'),
    device: z
      .union([microsoft_graph_identity, z.object({}).partial().strict()])
      .describe('Optional. The device associated with this action.'),
    user: z
      .union([microsoft_graph_identity, z.object({}).partial().strict()])
      .describe('Optional. The user associated with this action.'),
  })
  .partial()
  .strict();
const microsoft_graph_sharepointIds = z
  .object({
    listId: z
      .string()
      .describe("The unique identifier (guid) for the item's list in SharePoint.")
      .nullable(),
    listItemId: z
      .string()
      .describe('An integer identifier for the item within the containing list.')
      .nullable(),
    listItemUniqueId: z
      .string()
      .describe(
        'The unique identifier (guid) for the item within OneDrive for Business or a SharePoint site.'
      )
      .nullable(),
    siteId: z
      .string()
      .describe("The unique identifier (guid) for the item's site collection (SPSite).")
      .nullable(),
    siteUrl: z
      .string()
      .describe('The SharePoint URL for the site that contains the item.')
      .nullable(),
    tenantId: z.string().describe('The unique identifier (guid) for the tenancy.').nullable(),
    webId: z
      .string()
      .describe("The unique identifier (guid) for the item's site (SPWeb).")
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_itemReference = z
  .object({
    driveId: z
      .string()
      .describe(
        'Unique identifier of the drive instance that contains the driveItem. Only returned if the item is located in a drive. Read-only.'
      )
      .nullable(),
    driveType: z
      .string()
      .describe(
        'Identifies the type of drive. Only returned if the item is located in a drive. See drive resource for values.'
      )
      .nullable(),
    id: z
      .string()
      .describe(
        'Unique identifier of the driveItem in the drive or a listItem in a list. Read-only.'
      )
      .nullable(),
    name: z.string().describe('The name of the item being referenced. Read-only.').nullable(),
    path: z
      .string()
      .describe('Percent-encoded path that can be used to navigate to the item. Read-only.')
      .nullable(),
    shareId: z
      .string()
      .describe(
        'A unique identifier for a shared resource that can be accessed via the Shares API.'
      )
      .nullable(),
    sharepointIds: z
      .union([microsoft_graph_sharepointIds, z.object({}).partial().strict()])
      .describe('Returns identifiers useful for SharePoint REST compatibility. Read-only.'),
    siteId: z
      .string()
      .describe(
        'For OneDrive for Business and SharePoint, this property represents the ID of the site that contains the parent document library of the driveItem resource or the parent list of the listItem resource. The value is the same as the id property of that site resource. It is an opaque string that consists of three identifiers of the site. For OneDrive, this property is not populated.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_directoryObject = microsoft_graph_entity.and(
  z
    .object({
      deletedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "Date and time when this object was deleted. Always null when the object hasn't been deleted."
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_assignedLicense = z
  .object({
    disabledPlans: z
      .array(
        z
          .string()
          .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
          .uuid()
      )
      .describe(
        "A collection of the unique identifiers for plans that have been disabled. IDs are available in servicePlans > servicePlanId in the tenant's subscribedSkus or serviceStatus > servicePlanId in the tenant's companySubscription."
      ),
    skuId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .describe(
        'The unique identifier for the SKU. Corresponds to the skuId from subscribedSkus or companySubscription.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_assignedPlan = z
  .object({
    assignedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time at which the plan was assigned. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullable(),
    capabilityStatus: z
      .string()
      .describe(
        'Condition of the capability assignment. The possible values are Enabled, Warning, Suspended, Deleted, LockedOut. See a detailed description of each value.'
      )
      .nullable(),
    service: z.string().describe('The name of the service; for example, exchange.').nullable(),
    servicePlanId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .describe(
        'A GUID that identifies the service plan. For a complete list of GUIDs and their equivalent friendly service names, see Product names and service plan identifiers for licensing.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_authorizationInfo = z
  .object({ certificateUserIds: z.array(z.string().nullable()) })
  .partial()
  .strict();
const microsoft_graph_customSecurityAttributeValue = z.object({}).partial().strict();
const microsoft_graph_employeeOrgData = z
  .object({
    costCenter: z
      .string()
      .describe(
        'The cost center associated with the user. Returned only on $select. Supports $filter.'
      )
      .nullable(),
    division: z
      .string()
      .describe(
        'The name of the division in which the user works. Returned only on $select. Supports $filter.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_objectIdentity = z
  .object({
    issuer: z
      .string()
      .describe(
        "Specifies the issuer of the identity, for example facebook.com. 512 character limit. For local accounts (where signInType isn't federated), this property is the local default domain name for the tenant, for example contoso.com.  For guests from other Microsoft Entra organizations, this is the domain of the federated organization, for example contoso.com. For more information about filtering behavior for this property, see Filtering on the identities property of a user."
      )
      .nullable(),
    issuerAssignedId: z
      .string()
      .describe(
        'Specifies the unique identifier assigned to the user by the issuer. 64 character limit. The combination of issuer and issuerAssignedId must be unique within the organization. Represents the sign-in name for the user, when signInType is set to emailAddress or userName (also known as local accounts).When signInType is set to: emailAddress (or a custom string that starts with emailAddress like emailAddress1), issuerAssignedId must be a valid email addressuserName, issuerAssignedId must begin with an alphabetical character or number, and can only contain alphanumeric characters and the following symbols: - or _  For more information about filtering behavior for this property, see Filtering on the identities property of a user.'
      )
      .nullable(),
    signInType: z
      .string()
      .describe(
        'Specifies the user sign-in types in your directory, such as emailAddress, userName, federated, or userPrincipalName. federated represents a unique identifier for a user from an issuer that can be in any format chosen by the issuer. Setting or updating a userPrincipalName identity updates the value of the userPrincipalName property on the user object. The validations performed on the userPrincipalName property on the user object, for example, verified domains and acceptable characters, are performed when setting or updating a userPrincipalName identity. Extra validation is enforced on issuerAssignedId when the sign-in type is set to emailAddress or userName. This property can also be set to any custom string.  For more information about filtering behavior for this property, see Filtering on the identities property of a user.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_licenseAssignmentState = z
  .object({
    assignedByGroup: z.string().nullable(),
    disabledPlans: z.array(
      z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .nullable()
    ),
    error: z.string().nullable(),
    lastUpdatedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullable(),
    skuId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .nullable(),
    state: z.string().nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_externalAudienceScope = z.enum(['none', 'contactsOnly', 'all']);
const microsoft_graph_dateTimeTimeZone = z
  .object({
    dateTime: z
      .string()
      .describe(
        'A single point of time in a combined date and time representation ({date}T{time}; for example, 2017-08-29T04:00:00.0000000).'
      ),
    timeZone: z
      .string()
      .describe(
        "Represents a time zone, for example, 'Pacific Standard Time'. See below for more possible values."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_automaticRepliesStatus = z.enum(['disabled', 'alwaysEnabled', 'scheduled']);
const microsoft_graph_automaticRepliesSetting = z
  .object({
    externalAudience: z
      .union([microsoft_graph_externalAudienceScope, z.object({}).partial().strict()])
      .describe(
        "The set of audience external to the signed-in user's organization who will receive the ExternalReplyMessage, if Status is AlwaysEnabled or Scheduled. The possible values are: none, contactsOnly, all."
      ),
    externalReplyMessage: z
      .string()
      .describe(
        'The automatic reply to send to the specified external audience, if Status is AlwaysEnabled or Scheduled.'
      )
      .nullable(),
    internalReplyMessage: z
      .string()
      .describe(
        "The automatic reply to send to the audience internal to the signed-in user's organization, if Status is AlwaysEnabled or Scheduled."
      )
      .nullable(),
    scheduledEndDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
      .describe(
        'The date and time that automatic replies are set to end, if Status is set to Scheduled.'
      ),
    scheduledStartDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
      .describe(
        'The date and time that automatic replies are set to begin, if Status is set to Scheduled.'
      ),
    status: z
      .union([microsoft_graph_automaticRepliesStatus, z.object({}).partial().strict()])
      .describe(
        'Configurations status for automatic replies. The possible values are: disabled, alwaysEnabled, scheduled.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_delegateMeetingMessageDeliveryOptions = z.enum([
  'sendToDelegateAndInformationToPrincipal',
  'sendToDelegateAndPrincipal',
  'sendToDelegateOnly',
]);
const microsoft_graph_localeInfo = z
  .object({
    displayName: z
      .string()
      .describe(
        "A name representing the user's locale in natural language, for example, 'English (United States)'."
      )
      .nullable(),
    locale: z
      .string()
      .describe(
        "A locale representation for the user, which includes the user's preferred language and country/region. For example, 'en-us'. The language component follows 2-letter codes as defined in ISO 639-1, and the country component follows 2-letter codes as defined in ISO 3166-1 alpha-2."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_userPurpose = z.enum([
  'user',
  'linked',
  'shared',
  'room',
  'equipment',
  'others',
  'unknownFutureValue',
]);
const microsoft_graph_dayOfWeek = z.enum([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]);
const microsoft_graph_timeZoneBase = z
  .object({
    name: z
      .string()
      .describe(
        "The name of a time zone. It can be a standard time zone name such as 'Hawaii-Aleutian Standard Time', or 'Customized Time Zone' for a custom time zone."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_workingHours = z
  .object({
    daysOfWeek: z
      .array(z.union([microsoft_graph_dayOfWeek, z.object({}).partial().strict()]))
      .describe('The days of the week on which the user works.'),
    endTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .describe('The time of the day that the user stops working.')
      .nullable(),
    startTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .describe('The time of the day that the user starts working.')
      .nullable(),
    timeZone: z
      .union([microsoft_graph_timeZoneBase, z.object({}).partial().strict()])
      .describe('The time zone to which the working hours apply.'),
  })
  .partial()
  .strict();
const microsoft_graph_mailboxSettings = z
  .object({
    archiveFolder: z.string().describe('Folder ID of an archive folder for the user.').nullable(),
    automaticRepliesSetting: z
      .union([microsoft_graph_automaticRepliesSetting, z.object({}).partial().strict()])
      .describe(
        'Configuration settings to automatically notify the sender of an incoming email with a message from the signed-in user.'
      ),
    dateFormat: z.string().describe("The date format for the user's mailbox.").nullable(),
    delegateMeetingMessageDeliveryOptions: z
      .union([
        microsoft_graph_delegateMeetingMessageDeliveryOptions,
        z.object({}).partial().strict(),
      ])
      .describe(
        'If the user has a calendar delegate, this specifies whether the delegate, mailbox owner, or both receive meeting messages and meeting responses. Possible values are: sendToDelegateAndInformationToPrincipal, sendToDelegateAndPrincipal, sendToDelegateOnly.'
      ),
    language: z
      .union([microsoft_graph_localeInfo, z.object({}).partial().strict()])
      .describe(
        'The locale information for the user, including the preferred language and country/region.'
      ),
    timeFormat: z.string().describe("The time format for the user's mailbox.").nullable(),
    timeZone: z.string().describe("The default time zone for the user's mailbox.").nullable(),
    userPurpose: z
      .union([microsoft_graph_userPurpose, z.object({}).partial().strict()])
      .describe(
        'The purpose of the mailbox. Differentiates a mailbox for a single user from a shared mailbox and equipment mailbox in Exchange Online. Possible values are: user, linked, shared, room, equipment, others, unknownFutureValue. Read-only.'
      ),
    workingHours: z
      .union([microsoft_graph_workingHours, z.object({}).partial().strict()])
      .describe('The days of the week and hours in a specific time zone that the user works.'),
  })
  .partial()
  .strict();
const microsoft_graph_onPremisesExtensionAttributes = z
  .object({
    extensionAttribute1: z.string().describe('First customizable extension attribute.').nullable(),
    extensionAttribute10: z.string().describe('Tenth customizable extension attribute.').nullable(),
    extensionAttribute11: z
      .string()
      .describe('Eleventh customizable extension attribute.')
      .nullable(),
    extensionAttribute12: z
      .string()
      .describe('Twelfth customizable extension attribute.')
      .nullable(),
    extensionAttribute13: z
      .string()
      .describe('Thirteenth customizable extension attribute.')
      .nullable(),
    extensionAttribute14: z
      .string()
      .describe('Fourteenth customizable extension attribute.')
      .nullable(),
    extensionAttribute15: z
      .string()
      .describe('Fifteenth customizable extension attribute.')
      .nullable(),
    extensionAttribute2: z.string().describe('Second customizable extension attribute.').nullable(),
    extensionAttribute3: z.string().describe('Third customizable extension attribute.').nullable(),
    extensionAttribute4: z.string().describe('Fourth customizable extension attribute.').nullable(),
    extensionAttribute5: z.string().describe('Fifth customizable extension attribute.').nullable(),
    extensionAttribute6: z.string().describe('Sixth customizable extension attribute.').nullable(),
    extensionAttribute7: z
      .string()
      .describe('Seventh customizable extension attribute.')
      .nullable(),
    extensionAttribute8: z.string().describe('Eighth customizable extension attribute.').nullable(),
    extensionAttribute9: z.string().describe('Ninth customizable extension attribute.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_onPremisesProvisioningError = z
  .object({
    category: z
      .string()
      .describe(
        'Category of the provisioning error. Note: Currently, there is only one possible value. Possible value: PropertyConflict - indicates a property value is not unique. Other objects contain the same value for the property.'
      )
      .nullable(),
    occurredDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The date and time at which the error occurred.')
      .nullable(),
    propertyCausingError: z
      .string()
      .describe(
        'Name of the directory property causing the error. Current possible values: UserPrincipalName or ProxyAddress'
      )
      .nullable(),
    value: z.string().describe('Value of the property causing the error.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_passwordProfile = z
  .object({
    forceChangePasswordNextSignIn: z
      .boolean()
      .describe('true if the user must change their password on the next sign-in; otherwise false.')
      .nullable(),
    forceChangePasswordNextSignInWithMfa: z
      .boolean()
      .describe(
        'If true, at next sign-in, the user must perform a multifactor authentication (MFA) before being forced to change their password. The behavior is identical to forceChangePasswordNextSignIn except that the user is required to first perform a multifactor authentication before password change. After a password change, this property will be automatically reset to false. If not set, default is false.'
      )
      .nullable(),
    password: z
      .string()
      .describe(
        "The password for the user. This property is required when a user is created. It can be updated, but the user will be required to change the password on the next sign-in. The password must satisfy minimum requirements as specified by the user's passwordPolicies property. By default, a strong password is required."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_printColorMode = z.enum([
  'blackAndWhite',
  'grayscale',
  'color',
  'auto',
  'unknownFutureValue',
]);
const microsoft_graph_integerRange = z
  .object({
    end: z.number().describe('The inclusive upper bound of the integer range.').nullable(),
    start: z.number().describe('The inclusive lower bound of the integer range.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_printDuplexMode = z.enum([
  'flipOnLongEdge',
  'flipOnShortEdge',
  'oneSided',
  'unknownFutureValue',
]);
const microsoft_graph_printerFeedOrientation = z.enum([
  'longEdgeFirst',
  'shortEdgeFirst',
  'unknownFutureValue',
]);
const microsoft_graph_printFinishing = z.enum([
  'none',
  'staple',
  'punch',
  'cover',
  'bind',
  'saddleStitch',
  'stitchEdge',
  'stapleTopLeft',
  'stapleBottomLeft',
  'stapleTopRight',
  'stapleBottomRight',
  'stitchLeftEdge',
  'stitchTopEdge',
  'stitchRightEdge',
  'stitchBottomEdge',
  'stapleDualLeft',
  'stapleDualTop',
  'stapleDualRight',
  'stapleDualBottom',
  'unknownFutureValue',
  'stapleTripleLeft',
  'stapleTripleTop',
  'stapleTripleRight',
  'stapleTripleBottom',
  'bindLeft',
  'bindTop',
  'bindRight',
  'bindBottom',
  'foldAccordion',
  'foldDoubleGate',
  'foldGate',
  'foldHalf',
  'foldHalfZ',
  'foldLeftGate',
  'foldLetter',
  'foldParallel',
  'foldPoster',
  'foldRightGate',
  'foldZ',
  'foldEngineeringZ',
  'punchTopLeft',
  'punchBottomLeft',
  'punchTopRight',
  'punchBottomRight',
  'punchDualLeft',
  'punchDualTop',
  'punchDualRight',
  'punchDualBottom',
  'punchTripleLeft',
  'punchTripleTop',
  'punchTripleRight',
  'punchTripleBottom',
  'punchQuadLeft',
  'punchQuadTop',
  'punchQuadRight',
  'punchQuadBottom',
  'fold',
  'trim',
  'bale',
  'bookletMaker',
  'coat',
  'laminate',
  'trimAfterPages',
  'trimAfterDocuments',
  'trimAfterCopies',
  'trimAfterJob',
]);
const microsoft_graph_printMultipageLayout = z.enum([
  'clockwiseFromTopLeft',
  'counterclockwiseFromTopLeft',
  'counterclockwiseFromTopRight',
  'clockwiseFromTopRight',
  'counterclockwiseFromBottomLeft',
  'clockwiseFromBottomLeft',
  'counterclockwiseFromBottomRight',
  'clockwiseFromBottomRight',
  'unknownFutureValue',
]);
const microsoft_graph_printOrientation = z.enum([
  'portrait',
  'landscape',
  'reverseLandscape',
  'reversePortrait',
  'unknownFutureValue',
]);
const microsoft_graph_printQuality = z.enum(['low', 'medium', 'high', 'unknownFutureValue']);
const microsoft_graph_printScaling = z.enum([
  'auto',
  'shrinkToFit',
  'fill',
  'fit',
  'none',
  'unknownFutureValue',
]);
const microsoft_graph_printerCapabilities = z
  .object({
    bottomMargins: z
      .array(z.number().gte(-2147483648).lte(2147483647).nullable())
      .describe('A list of supported bottom margins(in microns) for the printer.'),
    collation: z
      .boolean()
      .describe(
        'True if the printer supports collating when printing muliple copies of a multi-page document; false otherwise.'
      )
      .nullable(),
    colorModes: z
      .array(z.union([microsoft_graph_printColorMode, z.object({}).partial().strict()]))
      .describe(
        'The color modes supported by the printer. Valid values are described in the following table.'
      ),
    contentTypes: z
      .array(z.string().nullable())
      .describe(
        'A list of supported content (MIME) types that the printer supports. It is not guaranteed that the Universal Print service supports printing all of these MIME types.'
      ),
    copiesPerJob: z
      .union([microsoft_graph_integerRange, z.object({}).partial().strict()])
      .describe('The range of copies per job supported by the printer.'),
    dpis: z
      .array(z.number().gte(-2147483648).lte(2147483647).nullable())
      .describe('The list of print resolutions in DPI that are supported by the printer.'),
    duplexModes: z
      .array(z.union([microsoft_graph_printDuplexMode, z.object({}).partial().strict()]))
      .describe(
        'The list of duplex modes that are supported by the printer. Valid values are described in the following table.'
      ),
    feedOrientations: z
      .array(z.union([microsoft_graph_printerFeedOrientation, z.object({}).partial().strict()]))
      .describe('The list of feed orientations that are supported by the printer.'),
    finishings: z
      .array(z.union([microsoft_graph_printFinishing, z.object({}).partial().strict()]))
      .describe('Finishing processes the printer supports for a printed document.'),
    inputBins: z.array(z.string().nullable()).describe('Supported input bins for the printer.'),
    isColorPrintingSupported: z
      .boolean()
      .describe('True if color printing is supported by the printer; false otherwise. Read-only.')
      .nullable(),
    isPageRangeSupported: z
      .boolean()
      .describe('True if the printer supports printing by page ranges; false otherwise.')
      .nullable(),
    leftMargins: z
      .array(z.number().gte(-2147483648).lte(2147483647).nullable())
      .describe('A list of supported left margins(in microns) for the printer.'),
    mediaColors: z
      .array(z.string().nullable())
      .describe('The media (i.e., paper) colors supported by the printer.'),
    mediaSizes: z
      .array(z.string().nullable())
      .describe(
        'The media sizes supported by the printer. Supports standard size names for ISO and ANSI media sizes. Valid values are in the following table.'
      ),
    mediaTypes: z
      .array(z.string().nullable())
      .describe('The media types supported by the printer.'),
    multipageLayouts: z
      .array(z.union([microsoft_graph_printMultipageLayout, z.object({}).partial().strict()]))
      .describe(
        'The presentation directions supported by the printer. Supported values are described in the following table.'
      ),
    orientations: z
      .array(z.union([microsoft_graph_printOrientation, z.object({}).partial().strict()]))
      .describe(
        'The print orientations supported by the printer. Valid values are described in the following table.'
      ),
    outputBins: z
      .array(z.string().nullable())
      .describe("The printer's supported output bins (trays)."),
    pagesPerSheet: z
      .array(z.number().gte(-2147483648).lte(2147483647).nullable())
      .describe('Supported number of Input Pages to impose upon a single Impression.'),
    qualities: z
      .array(z.union([microsoft_graph_printQuality, z.object({}).partial().strict()]))
      .describe('The print qualities supported by the printer.'),
    rightMargins: z
      .array(z.number().gte(-2147483648).lte(2147483647).nullable())
      .describe('A list of supported right margins(in microns) for the printer.'),
    scalings: z
      .array(z.union([microsoft_graph_printScaling, z.object({}).partial().strict()]))
      .describe('Supported print scalings.'),
    supportsFitPdfToPage: z
      .boolean()
      .describe(
        'True if the printer supports scaling PDF pages to match the print media size; false otherwise.'
      )
      .nullable(),
    topMargins: z
      .array(z.number().gte(-2147483648).lte(2147483647).nullable())
      .describe('A list of supported top margins(in microns) for the printer.'),
  })
  .partial()
  .strict();
const microsoft_graph_printerDefaults = z
  .object({
    colorMode: z
      .union([microsoft_graph_printColorMode, z.object({}).partial().strict()])
      .describe(
        'The default color mode to use when printing the document. Valid values are described in the following table.'
      ),
    contentType: z
      .string()
      .describe('The default content (MIME) type to use when processing documents.')
      .nullable(),
    copiesPerJob: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The default number of copies printed per job.')
      .nullable(),
    dpi: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The default resolution in DPI to use when printing the job.')
      .nullable(),
    duplexMode: z
      .union([microsoft_graph_printDuplexMode, z.object({}).partial().strict()])
      .describe(
        'The default duplex (double-sided) configuration to use when printing a document. Valid values are described in the following table.'
      ),
    finishings: z
      .array(z.union([microsoft_graph_printFinishing, z.object({}).partial().strict()]))
      .describe(
        'The default set of finishings to apply to print jobs. Valid values are described in the following table.'
      ),
    fitPdfToPage: z
      .boolean()
      .describe(
        'The default fitPdfToPage setting. True to fit each page of a PDF document to a physical sheet of media; false to let the printer decide how to lay out impressions.'
      )
      .nullable(),
    inputBin: z
      .string()
      .describe('The default input bin that serves as the paper source.')
      .nullable(),
    mediaColor: z
      .string()
      .describe('The default media (such as paper) color to print the document on.')
      .nullable(),
    mediaSize: z
      .string()
      .describe(
        'The default media size to use. Supports standard size names for ISO and ANSI media sizes. Valid values are listed in the printerCapabilities topic.'
      )
      .nullable(),
    mediaType: z
      .string()
      .describe('The default media (such as paper) type to print the document on.')
      .nullable(),
    multipageLayout: z
      .union([microsoft_graph_printMultipageLayout, z.object({}).partial().strict()])
      .describe(
        'The default direction to lay out pages when multiple pages are being printed per sheet. Valid values are described in the following table.'
      ),
    orientation: z
      .union([microsoft_graph_printOrientation, z.object({}).partial().strict()])
      .describe(
        'The default orientation to use when printing the document. Valid values are described in the following table.'
      ),
    outputBin: z
      .string()
      .describe(
        "The default output bin to place completed prints into. See the printer's capabilities for a list of supported output bins."
      )
      .nullable(),
    pagesPerSheet: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The default number of document pages to print on each sheet.')
      .nullable(),
    quality: z
      .union([microsoft_graph_printQuality, z.object({}).partial().strict()])
      .describe(
        'The default quality to use when printing the document. Valid values are described in the following table.'
      ),
    scaling: z
      .union([microsoft_graph_printScaling, z.object({}).partial().strict()])
      .describe(
        'Specifies how the printer scales the document data to fit the requested media. Valid values are described in the following table.'
      ),
  })
  .partial()
  .strict();
const ReferenceNumeric = z.enum(['-INF', 'INF', 'NaN']);
const microsoft_graph_printerLocation = z
  .object({
    altitudeInMeters: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The altitude, in meters, that the printer is located at.')
      .nullable(),
    building: z.string().describe('The building that the printer is located in.').nullable(),
    city: z.string().describe('The city that the printer is located in.').nullable(),
    countryOrRegion: z
      .string()
      .describe('The country or region that the printer is located in.')
      .nullable(),
    floor: z
      .string()
      .describe(
        'The floor that the printer is located on. Only numerical values are supported right now.'
      )
      .nullable(),
    floorDescription: z
      .string()
      .describe('The description of the floor that the printer is located on.')
      .nullable(),
    latitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The latitude that the printer is located at.'),
    longitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The longitude that the printer is located at.'),
    organization: z
      .array(z.string().nullable())
      .describe(
        'The organizational hierarchy that the printer belongs to. The elements should be in hierarchical order.'
      ),
    postalCode: z.string().describe('The postal code that the printer is located in.').nullable(),
    roomDescription: z
      .string()
      .describe('The description of the room that the printer is located in.')
      .nullable(),
    roomName: z
      .string()
      .describe(
        'The room that the printer is located in. Only numerical values are supported right now.'
      )
      .nullable(),
    site: z.string().describe('The site that the printer is located in.').nullable(),
    stateOrProvince: z
      .string()
      .describe('The state or province that the printer is located in.')
      .nullable(),
    streetAddress: z
      .string()
      .describe('The street address where the printer is located.')
      .nullable(),
    subdivision: z
      .array(z.string().nullable())
      .describe(
        'The subdivision that the printer is located in. The elements should be in hierarchical order.'
      ),
    subunit: z.array(z.string().nullable()),
  })
  .partial()
  .strict();
const microsoft_graph_printerProcessingStateDetail = z.enum([
  'paused',
  'mediaJam',
  'mediaNeeded',
  'mediaLow',
  'mediaEmpty',
  'coverOpen',
  'interlockOpen',
  'outputTrayMissing',
  'outputAreaFull',
  'markerSupplyLow',
  'markerSupplyEmpty',
  'inputTrayMissing',
  'outputAreaAlmostFull',
  'markerWasteAlmostFull',
  'markerWasteFull',
  'fuserOverTemp',
  'fuserUnderTemp',
  'other',
  'none',
  'movingToPaused',
  'shutdown',
  'connectingToDevice',
  'timedOut',
  'stopping',
  'stoppedPartially',
  'tonerLow',
  'tonerEmpty',
  'spoolAreaFull',
  'doorOpen',
  'opticalPhotoConductorNearEndOfLife',
  'opticalPhotoConductorLifeOver',
  'developerLow',
  'developerEmpty',
  'interpreterResourceUnavailable',
  'unknownFutureValue',
  'alertRemovalOfBinaryChangeEntry',
  'banderAdded',
  'banderAlmostEmpty',
  'banderAlmostFull',
  'banderAtLimit',
  'banderClosed',
  'banderConfigurationChange',
  'banderCoverClosed',
  'banderCoverOpen',
  'banderEmpty',
  'banderFull',
  'banderInterlockClosed',
  'banderInterlockOpen',
  'banderJam',
  'banderLifeAlmostOver',
  'banderLifeOver',
  'banderMemoryExhausted',
  'banderMissing',
  'banderMotorFailure',
  'banderNearLimit',
  'banderOffline',
  'banderOpened',
  'banderOverTemperature',
  'banderPowerSaver',
  'banderRecoverableFailure',
  'banderRecoverableStorage',
  'banderRemoved',
  'banderResourceAdded',
  'banderResourceRemoved',
  'banderThermistorFailure',
  'banderTimingFailure',
  'banderTurnedOff',
  'banderTurnedOn',
  'banderUnderTemperature',
  'banderUnrecoverableFailure',
  'banderUnrecoverableStorageError',
  'banderWarmingUp',
  'binderAdded',
  'binderAlmostEmpty',
  'binderAlmostFull',
  'binderAtLimit',
  'binderClosed',
  'binderConfigurationChange',
  'binderCoverClosed',
  'binderCoverOpen',
  'binderEmpty',
  'binderFull',
  'binderInterlockClosed',
  'binderInterlockOpen',
  'binderJam',
  'binderLifeAlmostOver',
  'binderLifeOver',
  'binderMemoryExhausted',
  'binderMissing',
  'binderMotorFailure',
  'binderNearLimit',
  'binderOffline',
  'binderOpened',
  'binderOverTemperature',
  'binderPowerSaver',
  'binderRecoverableFailure',
  'binderRecoverableStorage',
  'binderRemoved',
  'binderResourceAdded',
  'binderResourceRemoved',
  'binderThermistorFailure',
  'binderTimingFailure',
  'binderTurnedOff',
  'binderTurnedOn',
  'binderUnderTemperature',
  'binderUnrecoverableFailure',
  'binderUnrecoverableStorageError',
  'binderWarmingUp',
  'cameraFailure',
  'chamberCooling',
  'chamberFailure',
  'chamberHeating',
  'chamberTemperatureHigh',
  'chamberTemperatureLow',
  'cleanerLifeAlmostOver',
  'cleanerLifeOver',
  'configurationChange',
  'deactivated',
  'deleted',
  'dieCutterAdded',
  'dieCutterAlmostEmpty',
  'dieCutterAlmostFull',
  'dieCutterAtLimit',
  'dieCutterClosed',
  'dieCutterConfigurationChange',
  'dieCutterCoverClosed',
  'dieCutterCoverOpen',
  'dieCutterEmpty',
  'dieCutterFull',
  'dieCutterInterlockClosed',
  'dieCutterInterlockOpen',
  'dieCutterJam',
  'dieCutterLifeAlmostOver',
  'dieCutterLifeOver',
  'dieCutterMemoryExhausted',
  'dieCutterMissing',
  'dieCutterMotorFailure',
  'dieCutterNearLimit',
  'dieCutterOffline',
  'dieCutterOpened',
  'dieCutterOverTemperature',
  'dieCutterPowerSaver',
  'dieCutterRecoverableFailure',
  'dieCutterRecoverableStorage',
  'dieCutterRemoved',
  'dieCutterResourceAdded',
  'dieCutterResourceRemoved',
  'dieCutterThermistorFailure',
  'dieCutterTimingFailure',
  'dieCutterTurnedOff',
  'dieCutterTurnedOn',
  'dieCutterUnderTemperature',
  'dieCutterUnrecoverableFailure',
  'dieCutterUnrecoverableStorageError',
  'dieCutterWarmingUp',
  'extruderCooling',
  'extruderFailure',
  'extruderHeating',
  'extruderJam',
  'extruderTemperatureHigh',
  'extruderTemperatureLow',
  'fanFailure',
  'faxModemLifeAlmostOver',
  'faxModemLifeOver',
  'faxModemMissing',
  'faxModemTurnedOff',
  'faxModemTurnedOn',
  'folderAdded',
  'folderAlmostEmpty',
  'folderAlmostFull',
  'folderAtLimit',
  'folderClosed',
  'folderConfigurationChange',
  'folderCoverClosed',
  'folderCoverOpen',
  'folderEmpty',
  'folderFull',
  'folderInterlockClosed',
  'folderInterlockOpen',
  'folderJam',
  'folderLifeAlmostOver',
  'folderLifeOver',
  'folderMemoryExhausted',
  'folderMissing',
  'folderMotorFailure',
  'folderNearLimit',
  'folderOffline',
  'folderOpened',
  'folderOverTemperature',
  'folderPowerSaver',
  'folderRecoverableFailure',
  'folderRecoverableStorage',
  'folderRemoved',
  'folderResourceAdded',
  'folderResourceRemoved',
  'folderThermistorFailure',
  'folderTimingFailure',
  'folderTurnedOff',
  'folderTurnedOn',
  'folderUnderTemperature',
  'folderUnrecoverableFailure',
  'folderUnrecoverableStorageError',
  'folderWarmingUp',
  'hibernate',
  'holdNewJobs',
  'identifyPrinterRequested',
  'imprinterAdded',
  'imprinterAlmostEmpty',
  'imprinterAlmostFull',
  'imprinterAtLimit',
  'imprinterClosed',
  'imprinterConfigurationChange',
  'imprinterCoverClosed',
  'imprinterCoverOpen',
  'imprinterEmpty',
  'imprinterFull',
  'imprinterInterlockClosed',
  'imprinterInterlockOpen',
  'imprinterJam',
  'imprinterLifeAlmostOver',
  'imprinterLifeOver',
  'imprinterMemoryExhausted',
  'imprinterMissing',
  'imprinterMotorFailure',
  'imprinterNearLimit',
  'imprinterOffline',
  'imprinterOpened',
  'imprinterOverTemperature',
  'imprinterPowerSaver',
  'imprinterRecoverableFailure',
  'imprinterRecoverableStorage',
  'imprinterRemoved',
  'imprinterResourceAdded',
  'imprinterResourceRemoved',
  'imprinterThermistorFailure',
  'imprinterTimingFailure',
  'imprinterTurnedOff',
  'imprinterTurnedOn',
  'imprinterUnderTemperature',
  'imprinterUnrecoverableFailure',
  'imprinterUnrecoverableStorageError',
  'imprinterWarmingUp',
  'inputCannotFeedSizeSelected',
  'inputManualInputRequest',
  'inputMediaColorChange',
  'inputMediaFormPartsChange',
  'inputMediaSizeChange',
  'inputMediaTrayFailure',
  'inputMediaTrayFeedError',
  'inputMediaTrayJam',
  'inputMediaTypeChange',
  'inputMediaWeightChange',
  'inputPickRollerFailure',
  'inputPickRollerLifeOver',
  'inputPickRollerLifeWarn',
  'inputPickRollerMissing',
  'inputTrayElevationFailure',
  'inputTrayPositionFailure',
  'inserterAdded',
  'inserterAlmostEmpty',
  'inserterAlmostFull',
  'inserterAtLimit',
  'inserterClosed',
  'inserterConfigurationChange',
  'inserterCoverClosed',
  'inserterCoverOpen',
  'inserterEmpty',
  'inserterFull',
  'inserterInterlockClosed',
  'inserterInterlockOpen',
  'inserterJam',
  'inserterLifeAlmostOver',
  'inserterLifeOver',
  'inserterMemoryExhausted',
  'inserterMissing',
  'inserterMotorFailure',
  'inserterNearLimit',
  'inserterOffline',
  'inserterOpened',
  'inserterOverTemperature',
  'inserterPowerSaver',
  'inserterRecoverableFailure',
  'inserterRecoverableStorage',
  'inserterRemoved',
  'inserterResourceAdded',
  'inserterResourceRemoved',
  'inserterThermistorFailure',
  'inserterTimingFailure',
  'inserterTurnedOff',
  'inserterTurnedOn',
  'inserterUnderTemperature',
  'inserterUnrecoverableFailure',
  'inserterUnrecoverableStorageError',
  'inserterWarmingUp',
  'interlockClosed',
  'interpreterCartridgeAdded',
  'interpreterCartridgeDeleted',
  'interpreterComplexPageEncountered',
  'interpreterMemoryDecrease',
  'interpreterMemoryIncrease',
  'interpreterResourceAdded',
  'interpreterResourceDeleted',
  'lampAtEol',
  'lampFailure',
  'lampNearEol',
  'laserAtEol',
  'laserFailure',
  'laserNearEol',
  'makeEnvelopeAdded',
  'makeEnvelopeAlmostEmpty',
  'makeEnvelopeAlmostFull',
  'makeEnvelopeAtLimit',
  'makeEnvelopeClosed',
  'makeEnvelopeConfigurationChange',
  'makeEnvelopeCoverClosed',
  'makeEnvelopeCoverOpen',
  'makeEnvelopeEmpty',
  'makeEnvelopeFull',
  'makeEnvelopeInterlockClosed',
  'makeEnvelopeInterlockOpen',
  'makeEnvelopeJam',
  'makeEnvelopeLifeAlmostOver',
  'makeEnvelopeLifeOver',
  'makeEnvelopeMemoryExhausted',
  'makeEnvelopeMissing',
  'makeEnvelopeMotorFailure',
  'makeEnvelopeNearLimit',
  'makeEnvelopeOffline',
  'makeEnvelopeOpened',
  'makeEnvelopeOverTemperature',
  'makeEnvelopePowerSaver',
  'makeEnvelopeRecoverableFailure',
  'makeEnvelopeRecoverableStorage',
  'makeEnvelopeRemoved',
  'makeEnvelopeResourceAdded',
  'makeEnvelopeResourceRemoved',
  'makeEnvelopeThermistorFailure',
  'makeEnvelopeTimingFailure',
  'makeEnvelopeTurnedOff',
  'makeEnvelopeTurnedOn',
  'makeEnvelopeUnderTemperature',
  'makeEnvelopeUnrecoverableFailure',
  'makeEnvelopeUnrecoverableStorageError',
  'makeEnvelopeWarmingUp',
  'markerAdjustingPrintQuality',
  'markerCleanerMissing',
  'markerDeveloperAlmostEmpty',
  'markerDeveloperEmpty',
  'markerDeveloperMissing',
  'markerFuserMissing',
  'markerFuserThermistorFailure',
  'markerFuserTimingFailure',
  'markerInkAlmostEmpty',
  'markerInkEmpty',
  'markerInkMissing',
  'markerOpcMissing',
  'markerPrintRibbonAlmostEmpty',
  'markerPrintRibbonEmpty',
  'markerPrintRibbonMissing',
  'markerSupplyAlmostEmpty',
  'markerSupplyMissing',
  'markerTonerCartridgeMissing',
  'markerTonerMissing',
  'markerWasteInkReceptacleAlmostFull',
  'markerWasteInkReceptacleFull',
  'markerWasteInkReceptacleMissing',
  'markerWasteMissing',
  'markerWasteTonerReceptacleAlmostFull',
  'markerWasteTonerReceptacleFull',
  'markerWasteTonerReceptacleMissing',
  'materialEmpty',
  'materialLow',
  'materialNeeded',
  'mediaDrying',
  'mediaPathCannotDuplexMediaSelected',
  'mediaPathFailure',
  'mediaPathInputEmpty',
  'mediaPathInputFeedError',
  'mediaPathInputJam',
  'mediaPathInputRequest',
  'mediaPathJam',
  'mediaPathMediaTrayAlmostFull',
  'mediaPathMediaTrayFull',
  'mediaPathMediaTrayMissing',
  'mediaPathOutputFeedError',
  'mediaPathOutputFull',
  'mediaPathOutputJam',
  'mediaPathPickRollerFailure',
  'mediaPathPickRollerLifeOver',
  'mediaPathPickRollerLifeWarn',
  'mediaPathPickRollerMissing',
  'motorFailure',
  'outputMailboxSelectFailure',
  'outputMediaTrayFailure',
  'outputMediaTrayFeedError',
  'outputMediaTrayJam',
  'perforaterAdded',
  'perforaterAlmostEmpty',
  'perforaterAlmostFull',
  'perforaterAtLimit',
  'perforaterClosed',
  'perforaterConfigurationChange',
  'perforaterCoverClosed',
  'perforaterCoverOpen',
  'perforaterEmpty',
  'perforaterFull',
  'perforaterInterlockClosed',
  'perforaterInterlockOpen',
  'perforaterJam',
  'perforaterLifeAlmostOver',
  'perforaterLifeOver',
  'perforaterMemoryExhausted',
  'perforaterMissing',
  'perforaterMotorFailure',
  'perforaterNearLimit',
  'perforaterOffline',
  'perforaterOpened',
  'perforaterOverTemperature',
  'perforaterPowerSaver',
  'perforaterRecoverableFailure',
  'perforaterRecoverableStorage',
  'perforaterRemoved',
  'perforaterResourceAdded',
  'perforaterResourceRemoved',
  'perforaterThermistorFailure',
  'perforaterTimingFailure',
  'perforaterTurnedOff',
  'perforaterTurnedOn',
  'perforaterUnderTemperature',
  'perforaterUnrecoverableFailure',
  'perforaterUnrecoverableStorageError',
  'perforaterWarmingUp',
  'platformCooling',
  'platformFailure',
  'platformHeating',
  'platformTemperatureHigh',
  'platformTemperatureLow',
  'powerDown',
  'powerUp',
  'printerManualReset',
  'printerNmsReset',
  'printerReadyToPrint',
  'puncherAdded',
  'puncherAlmostEmpty',
  'puncherAlmostFull',
  'puncherAtLimit',
  'puncherClosed',
  'puncherConfigurationChange',
  'puncherCoverClosed',
  'puncherCoverOpen',
  'puncherEmpty',
  'puncherFull',
  'puncherInterlockClosed',
  'puncherInterlockOpen',
  'puncherJam',
  'puncherLifeAlmostOver',
  'puncherLifeOver',
  'puncherMemoryExhausted',
  'puncherMissing',
  'puncherMotorFailure',
  'puncherNearLimit',
  'puncherOffline',
  'puncherOpened',
  'puncherOverTemperature',
  'puncherPowerSaver',
  'puncherRecoverableFailure',
  'puncherRecoverableStorage',
  'puncherRemoved',
  'puncherResourceAdded',
  'puncherResourceRemoved',
  'puncherThermistorFailure',
  'puncherTimingFailure',
  'puncherTurnedOff',
  'puncherTurnedOn',
  'puncherUnderTemperature',
  'puncherUnrecoverableFailure',
  'puncherUnrecoverableStorageError',
  'puncherWarmingUp',
  'resuming',
  'scanMediaPathFailure',
  'scanMediaPathInputEmpty',
  'scanMediaPathInputFeedError',
  'scanMediaPathInputJam',
  'scanMediaPathInputRequest',
  'scanMediaPathJam',
  'scanMediaPathOutputFeedError',
  'scanMediaPathOutputFull',
  'scanMediaPathOutputJam',
  'scanMediaPathPickRollerFailure',
  'scanMediaPathPickRollerLifeOver',
  'scanMediaPathPickRollerLifeWarn',
  'scanMediaPathPickRollerMissing',
  'scanMediaPathTrayAlmostFull',
  'scanMediaPathTrayFull',
  'scanMediaPathTrayMissing',
  'scannerLightFailure',
  'scannerLightLifeAlmostOver',
  'scannerLightLifeOver',
  'scannerLightMissing',
  'scannerSensorFailure',
  'scannerSensorLifeAlmostOver',
  'scannerSensorLifeOver',
  'scannerSensorMissing',
  'separationCutterAdded',
  'separationCutterAlmostEmpty',
  'separationCutterAlmostFull',
  'separationCutterAtLimit',
  'separationCutterClosed',
  'separationCutterConfigurationChange',
  'separationCutterCoverClosed',
  'separationCutterCoverOpen',
  'separationCutterEmpty',
  'separationCutterFull',
  'separationCutterInterlockClosed',
  'separationCutterInterlockOpen',
  'separationCutterJam',
  'separationCutterLifeAlmostOver',
  'separationCutterLifeOver',
  'separationCutterMemoryExhausted',
  'separationCutterMissing',
  'separationCutterMotorFailure',
  'separationCutterNearLimit',
  'separationCutterOffline',
  'separationCutterOpened',
  'separationCutterOverTemperature',
  'separationCutterPowerSaver',
  'separationCutterRecoverableFailure',
  'separationCutterRecoverableStorage',
  'separationCutterRemoved',
  'separationCutterResourceAdded',
  'separationCutterResourceRemoved',
  'separationCutterThermistorFailure',
  'separationCutterTimingFailure',
  'separationCutterTurnedOff',
  'separationCutterTurnedOn',
  'separationCutterUnderTemperature',
  'separationCutterUnrecoverableFailure',
  'separationCutterUnrecoverableStorageError',
  'separationCutterWarmingUp',
  'sheetRotatorAdded',
  'sheetRotatorAlmostEmpty',
  'sheetRotatorAlmostFull',
  'sheetRotatorAtLimit',
  'sheetRotatorClosed',
  'sheetRotatorConfigurationChange',
  'sheetRotatorCoverClosed',
  'sheetRotatorCoverOpen',
  'sheetRotatorEmpty',
  'sheetRotatorFull',
  'sheetRotatorInterlockClosed',
  'sheetRotatorInterlockOpen',
  'sheetRotatorJam',
  'sheetRotatorLifeAlmostOver',
  'sheetRotatorLifeOver',
  'sheetRotatorMemoryExhausted',
  'sheetRotatorMissing',
  'sheetRotatorMotorFailure',
  'sheetRotatorNearLimit',
  'sheetRotatorOffline',
  'sheetRotatorOpened',
  'sheetRotatorOverTemperature',
  'sheetRotatorPowerSaver',
  'sheetRotatorRecoverableFailure',
  'sheetRotatorRecoverableStorage',
  'sheetRotatorRemoved',
  'sheetRotatorResourceAdded',
  'sheetRotatorResourceRemoved',
  'sheetRotatorThermistorFailure',
  'sheetRotatorTimingFailure',
  'sheetRotatorTurnedOff',
  'sheetRotatorTurnedOn',
  'sheetRotatorUnderTemperature',
  'sheetRotatorUnrecoverableFailure',
  'sheetRotatorUnrecoverableStorageError',
  'sheetRotatorWarmingUp',
  'slitterAdded',
  'slitterAlmostEmpty',
  'slitterAlmostFull',
  'slitterAtLimit',
  'slitterClosed',
  'slitterConfigurationChange',
  'slitterCoverClosed',
  'slitterCoverOpen',
  'slitterEmpty',
  'slitterFull',
  'slitterInterlockClosed',
  'slitterInterlockOpen',
  'slitterJam',
  'slitterLifeAlmostOver',
  'slitterLifeOver',
  'slitterMemoryExhausted',
  'slitterMissing',
  'slitterMotorFailure',
  'slitterNearLimit',
  'slitterOffline',
  'slitterOpened',
  'slitterOverTemperature',
  'slitterPowerSaver',
  'slitterRecoverableFailure',
  'slitterRecoverableStorage',
  'slitterRemoved',
  'slitterResourceAdded',
  'slitterResourceRemoved',
  'slitterThermistorFailure',
  'slitterTimingFailure',
  'slitterTurnedOff',
  'slitterTurnedOn',
  'slitterUnderTemperature',
  'slitterUnrecoverableFailure',
  'slitterUnrecoverableStorageError',
  'slitterWarmingUp',
  'stackerAdded',
  'stackerAlmostEmpty',
  'stackerAlmostFull',
  'stackerAtLimit',
  'stackerClosed',
  'stackerConfigurationChange',
  'stackerCoverClosed',
  'stackerCoverOpen',
  'stackerEmpty',
  'stackerFull',
  'stackerInterlockClosed',
  'stackerInterlockOpen',
  'stackerJam',
  'stackerLifeAlmostOver',
  'stackerLifeOver',
  'stackerMemoryExhausted',
  'stackerMissing',
  'stackerMotorFailure',
  'stackerNearLimit',
  'stackerOffline',
  'stackerOpened',
  'stackerOverTemperature',
  'stackerPowerSaver',
  'stackerRecoverableFailure',
  'stackerRecoverableStorage',
  'stackerRemoved',
  'stackerResourceAdded',
  'stackerResourceRemoved',
  'stackerThermistorFailure',
  'stackerTimingFailure',
  'stackerTurnedOff',
  'stackerTurnedOn',
  'stackerUnderTemperature',
  'stackerUnrecoverableFailure',
  'stackerUnrecoverableStorageError',
  'stackerWarmingUp',
  'standby',
  'staplerAdded',
  'staplerAlmostEmpty',
  'staplerAlmostFull',
  'staplerAtLimit',
  'staplerClosed',
  'staplerConfigurationChange',
  'staplerCoverClosed',
  'staplerCoverOpen',
  'staplerEmpty',
  'staplerFull',
  'staplerInterlockClosed',
  'staplerInterlockOpen',
  'staplerJam',
  'staplerLifeAlmostOver',
  'staplerLifeOver',
  'staplerMemoryExhausted',
  'staplerMissing',
  'staplerMotorFailure',
  'staplerNearLimit',
  'staplerOffline',
  'staplerOpened',
  'staplerOverTemperature',
  'staplerPowerSaver',
  'staplerRecoverableFailure',
  'staplerRecoverableStorage',
  'staplerRemoved',
  'staplerResourceAdded',
  'staplerResourceRemoved',
  'staplerThermistorFailure',
  'staplerTimingFailure',
  'staplerTurnedOff',
  'staplerTurnedOn',
  'staplerUnderTemperature',
  'staplerUnrecoverableFailure',
  'staplerUnrecoverableStorageError',
  'staplerWarmingUp',
  'stitcherAdded',
  'stitcherAlmostEmpty',
  'stitcherAlmostFull',
  'stitcherAtLimit',
  'stitcherClosed',
  'stitcherConfigurationChange',
  'stitcherCoverClosed',
  'stitcherCoverOpen',
  'stitcherEmpty',
  'stitcherFull',
  'stitcherInterlockClosed',
  'stitcherInterlockOpen',
  'stitcherJam',
  'stitcherLifeAlmostOver',
  'stitcherLifeOver',
  'stitcherMemoryExhausted',
  'stitcherMissing',
  'stitcherMotorFailure',
  'stitcherNearLimit',
  'stitcherOffline',
  'stitcherOpened',
  'stitcherOverTemperature',
  'stitcherPowerSaver',
  'stitcherRecoverableFailure',
  'stitcherRecoverableStorage',
  'stitcherRemoved',
  'stitcherResourceAdded',
  'stitcherResourceRemoved',
  'stitcherThermistorFailure',
  'stitcherTimingFailure',
  'stitcherTurnedOff',
  'stitcherTurnedOn',
  'stitcherUnderTemperature',
  'stitcherUnrecoverableFailure',
  'stitcherUnrecoverableStorageError',
  'stitcherWarmingUp',
  'subunitAdded',
  'subunitAlmostEmpty',
  'subunitAlmostFull',
  'subunitAtLimit',
  'subunitClosed',
  'subunitCoolingDown',
  'subunitEmpty',
  'subunitFull',
  'subunitLifeAlmostOver',
  'subunitLifeOver',
  'subunitMemoryExhausted',
  'subunitMissing',
  'subunitMotorFailure',
  'subunitNearLimit',
  'subunitOffline',
  'subunitOpened',
  'subunitOverTemperature',
  'subunitPowerSaver',
  'subunitRecoverableFailure',
  'subunitRecoverableStorage',
  'subunitRemoved',
  'subunitResourceAdded',
  'subunitResourceRemoved',
  'subunitThermistorFailure',
  'subunitTimingFailure',
  'subunitTurnedOff',
  'subunitTurnedOn',
  'subunitUnderTemperature',
  'subunitUnrecoverableFailure',
  'subunitUnrecoverableStorage',
  'subunitWarmingUp',
  'suspend',
  'testing',
  'trimmerAdded',
  'trimmerAlmostEmpty',
  'trimmerAlmostFull',
  'trimmerAtLimit',
  'trimmerClosed',
  'trimmerConfigurationChange',
  'trimmerCoverClosed',
  'trimmerCoverOpen',
  'trimmerEmpty',
  'trimmerFull',
  'trimmerInterlockClosed',
  'trimmerInterlockOpen',
  'trimmerJam',
  'trimmerLifeAlmostOver',
  'trimmerLifeOver',
  'trimmerMemoryExhausted',
  'trimmerMissing',
  'trimmerMotorFailure',
  'trimmerNearLimit',
  'trimmerOffline',
  'trimmerOpened',
  'trimmerOverTemperature',
  'trimmerPowerSaver',
  'trimmerRecoverableFailure',
  'trimmerRecoverableStorage',
  'trimmerRemoved',
  'trimmerResourceAdded',
  'trimmerResourceRemoved',
  'trimmerThermistorFailure',
  'trimmerTimingFailure',
  'trimmerTurnedOff',
  'trimmerTurnedOn',
  'trimmerUnderTemperature',
  'trimmerUnrecoverableFailure',
  'trimmerUnrecoverableStorageError',
  'trimmerWarmingUp',
  'unknown',
  'wrapperAdded',
  'wrapperAlmostEmpty',
  'wrapperAlmostFull',
  'wrapperAtLimit',
  'wrapperClosed',
  'wrapperConfigurationChange',
  'wrapperCoverClosed',
  'wrapperCoverOpen',
  'wrapperEmpty',
  'wrapperFull',
  'wrapperInterlockClosed',
  'wrapperInterlockOpen',
  'wrapperJam',
  'wrapperLifeAlmostOver',
  'wrapperLifeOver',
  'wrapperMemoryExhausted',
  'wrapperMissing',
  'wrapperMotorFailure',
  'wrapperNearLimit',
  'wrapperOffline',
  'wrapperOpened',
  'wrapperOverTemperature',
  'wrapperPowerSaver',
  'wrapperRecoverableFailure',
  'wrapperRecoverableStorage',
  'wrapperRemoved',
  'wrapperResourceAdded',
  'wrapperResourceRemoved',
  'wrapperThermistorFailure',
  'wrapperTimingFailure',
  'wrapperTurnedOff',
  'wrapperTurnedOn',
  'wrapperUnderTemperature',
  'wrapperUnrecoverableFailure',
  'wrapperUnrecoverableStorageError',
  'wrapperWarmingUp',
]);
const microsoft_graph_printerProcessingState = z.enum([
  'unknown',
  'idle',
  'processing',
  'stopped',
  'unknownFutureValue',
]);
const microsoft_graph_printerStatus = z
  .object({
    description: z
      .string()
      .describe(
        "A human-readable description of the printer's current processing state. Read-only."
      )
      .nullable(),
    details: z
      .array(microsoft_graph_printerProcessingStateDetail)
      .describe(
        'The list of details describing why the printer is in the current state. Valid values are described in the following table. Read-only.'
      ),
    state: microsoft_graph_printerProcessingState,
  })
  .partial()
  .strict();
const microsoft_graph_printMargin = z
  .object({
    bottom: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The margin in microns from the bottom edge.')
      .nullable(),
    left: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The margin in microns from the left edge.')
      .nullable(),
    right: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The margin in microns from the right edge.')
      .nullable(),
    top: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The margin in microns from the top edge.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_printJobConfiguration = z
  .object({
    collate: z
      .boolean()
      .describe(
        'Whether the printer should collate pages wehen printing multiple copies of a multi-page document.'
      )
      .nullable(),
    colorMode: z
      .union([microsoft_graph_printColorMode, z.object({}).partial().strict()])
      .describe(
        'The color mode the printer should use to print the job. Valid values are described in the table below. Read-only.'
      ),
    copies: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of copies that should be printed. Read-only.')
      .nullable(),
    dpi: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The resolution to use when printing the job, expressed in dots per inch (DPI). Read-only.'
      )
      .nullable(),
    duplexMode: z
      .union([microsoft_graph_printDuplexMode, z.object({}).partial().strict()])
      .describe(
        'The duplex mode the printer should use when printing the job. Valid values are described in the table below. Read-only.'
      ),
    feedOrientation: z
      .union([microsoft_graph_printerFeedOrientation, z.object({}).partial().strict()])
      .describe(
        'The orientation to use when feeding media into the printer. Valid values are described in the following table. Read-only.'
      ),
    finishings: z
      .array(z.union([microsoft_graph_printFinishing, z.object({}).partial().strict()]))
      .describe('Finishing processes to use when printing.'),
    fitPdfToPage: z
      .boolean()
      .describe(
        'True to fit each page of a PDF document to a physical sheet of media; false to let the printer decide how to lay out impressions.'
      )
      .nullable(),
    inputBin: z
      .string()
      .describe(
        "The input bin (tray) to use when printing. See the printer's capabilities for a list of supported input bins."
      )
      .nullable(),
    margin: z
      .union([microsoft_graph_printMargin, z.object({}).partial().strict()])
      .describe('The margin settings to use when printing.'),
    mediaSize: z
      .string()
      .describe(
        'The media size to use when printing. Supports standard size names for ISO and ANSI media sizes. Valid values listed in the printerCapabilities topic.'
      )
      .nullable(),
    mediaType: z
      .string()
      .describe('The default media (such as paper) type to print the document on.')
      .nullable(),
    multipageLayout: z
      .union([microsoft_graph_printMultipageLayout, z.object({}).partial().strict()])
      .describe(
        'The direction to lay out pages when multiple pages are being printed per sheet. Valid values are described in the following table.'
      ),
    orientation: z
      .union([microsoft_graph_printOrientation, z.object({}).partial().strict()])
      .describe(
        'The orientation setting the printer should use when printing the job. Valid values are described in the following table.'
      ),
    outputBin: z
      .string()
      .describe(
        "The output bin to place completed prints into. See the printer's capabilities for a list of supported output bins."
      )
      .nullable(),
    pageRanges: z
      .array(microsoft_graph_integerRange)
      .describe('The page ranges to print. Read-only.'),
    pagesPerSheet: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of document pages to print on each sheet.')
      .nullable(),
    quality: z
      .union([microsoft_graph_printQuality, z.object({}).partial().strict()])
      .describe(
        'The print quality to use when printing the job. Valid values are described in the table below. Read-only.'
      ),
    scaling: z
      .union([microsoft_graph_printScaling, z.object({}).partial().strict()])
      .describe(
        'Specifies how the printer should scale the document data to fit the requested media. Valid values are described in the following table.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_userIdentity = microsoft_graph_identity.and(
  z
    .object({
      ipAddress: z
        .string()
        .describe(
          'Indicates the client IP address associated with the user performing the activity (audit log only).'
        )
        .nullable(),
      userPrincipalName: z
        .string()
        .describe('The userPrincipalName attribute of the user.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_printJobStateDetail = z.enum([
  'uploadPending',
  'transforming',
  'completedSuccessfully',
  'completedWithWarnings',
  'completedWithErrors',
  'releaseWait',
  'interpreting',
  'unknownFutureValue',
]);
const microsoft_graph_printJobProcessingState = z.enum([
  'unknown',
  'pending',
  'processing',
  'paused',
  'stopped',
  'completed',
  'canceled',
  'aborted',
  'unknownFutureValue',
]);
const microsoft_graph_printJobStatus = z
  .object({
    description: z
      .string()
      .describe(
        "A human-readable description of the print job's current processing state. Read-only."
      ),
    details: z
      .array(microsoft_graph_printJobStateDetail)
      .describe(
        'Additional details for print job state. Valid values are described in the following table. Read-only.'
      ),
    isAcquiredByPrinter: z
      .boolean()
      .describe('True if the job was acknowledged by a printer; false otherwise. Read-only.'),
    state: microsoft_graph_printJobProcessingState,
  })
  .partial()
  .strict();
const microsoft_graph_printDocument = microsoft_graph_entity.and(
  z
    .object({
      contentType: z.string().describe("The document's content (MIME) type. Read-only.").nullable(),
      displayName: z.string().describe("The document's name. Read-only.").nullable(),
      downloadedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The time the document was downloaded. Read-only')
        .nullable(),
      size: z.number().describe("The document's size in bytes. Read-only."),
      uploadedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The time the document was uploaded. Read-only')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_printTaskProcessingState = z.enum([
  'pending',
  'processing',
  'completed',
  'aborted',
  'unknownFutureValue',
]);
const microsoft_graph_printTaskStatus = z
  .object({
    description: z
      .string()
      .describe('A human-readable description of the current processing state of the printTask.'),
    state: microsoft_graph_printTaskProcessingState,
  })
  .partial()
  .strict();
const microsoft_graph_appIdentity = z
  .object({
    appId: z
      .string()
      .describe('Refers to the unique ID representing application in Microsoft Entra ID.')
      .nullable(),
    displayName: z
      .string()
      .describe('Refers to the application name displayed in the Microsoft Entra admin center.')
      .nullable(),
    servicePrincipalId: z
      .string()
      .describe('Refers to the unique ID for the service principal in Microsoft Entra ID.')
      .nullable(),
    servicePrincipalName: z
      .string()
      .describe('Refers to the Service Principal Name is the Application name in the tenant.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_printTaskDefinition: z.ZodType<microsoft_graph_printTaskDefinition> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          createdBy: microsoft_graph_appIdentity,
          displayName: z.string().describe('The name of the printTaskDefinition.'),
          tasks: z
            .array(microsoft_graph_printTask)
            .describe(
              'A list of tasks that have been created based on this definition. The list includes currently running tasks and recently completed tasks. Read-only.'
            ),
        })
        .partial()
        .strict()
    )
);
const microsoft_graph_printEvent = z.enum(['jobStarted', 'unknownFutureValue']);
const microsoft_graph_printTaskTrigger: z.ZodType<microsoft_graph_printTaskTrigger> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        event: microsoft_graph_printEvent,
        definition: microsoft_graph_printTaskDefinition,
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_printTask: z.ZodType<microsoft_graph_printTask> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        parentUrl: z
          .string()
          .describe(
            'The URL for the print entity that triggered this task. For example, https://graph.microsoft.com/v1.0/print/printers/{printerId}/jobs/{jobId}. Read-only.'
          ),
        status: microsoft_graph_printTaskStatus,
        definition: microsoft_graph_printTaskDefinition,
        trigger: microsoft_graph_printTaskTrigger,
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_printJob = microsoft_graph_entity.and(
  z
    .object({
      acknowledgedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The dateTimeOffset when the job was acknowledged. Read-only.')
        .nullable(),
      configuration: microsoft_graph_printJobConfiguration,
      createdBy: z.union([microsoft_graph_userIdentity, z.object({}).partial().strict()]),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The DateTimeOffset when the job was created. Read-only.'),
      errorCode: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The error code of the print job. Read-only.')
        .nullable(),
      isFetchable: z.boolean().describe('If true, document can be fetched by printer.'),
      redirectedFrom: z
        .string()
        .describe(
          'Contains the source job URL, if the job has been redirected from another printer.'
        )
        .nullable(),
      redirectedTo: z
        .string()
        .describe(
          'Contains the destination job URL, if the job has been redirected to another printer.'
        )
        .nullable(),
      status: microsoft_graph_printJobStatus,
      documents: z.array(microsoft_graph_printDocument),
      tasks: z
        .array(microsoft_graph_printTask)
        .describe('A list of printTasks that were triggered by this print job.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_printerBase = microsoft_graph_entity.and(
  z
    .object({
      capabilities: z
        .union([microsoft_graph_printerCapabilities, z.object({}).partial().strict()])
        .describe('The capabilities of the printer/printerShare.'),
      defaults: z
        .union([microsoft_graph_printerDefaults, z.object({}).partial().strict()])
        .describe('The default print settings of printer/printerShare.'),
      displayName: z.string().describe('The name of the printer/printerShare.'),
      isAcceptingJobs: z
        .boolean()
        .describe(
          'Specifies whether the printer/printerShare is currently accepting new print jobs.'
        )
        .nullable(),
      location: z
        .union([microsoft_graph_printerLocation, z.object({}).partial().strict()])
        .describe('The physical and/or organizational location of the printer/printerShare.'),
      manufacturer: z.string().describe('The manufacturer of the printer/printerShare.').nullable(),
      model: z.string().describe('The model name of the printer/printerShare.').nullable(),
      status: microsoft_graph_printerStatus,
      jobs: z
        .array(microsoft_graph_printJob)
        .describe('The list of jobs that are queued for printing by the printer/printerShare.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_printerShareViewpoint = z
  .object({
    lastUsedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time when the printer was last used by the signed-in user. The timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_assignedLabel = z
  .object({
    displayName: z.string().describe('The display name of the label. Read-only.').nullable(),
    labelId: z.string().describe('The unique identifier of the label.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_licenseProcessingState = z
  .object({ state: z.string().nullable() })
  .partial()
  .strict();
const microsoft_graph_serviceProvisioningError = z
  .object({
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The date and time at which the error occurred.')
      .nullable(),
    isResolved: z
      .boolean()
      .describe('Indicates whether the error has been attended to.')
      .nullable(),
    serviceInstance: z
      .string()
      .describe(
        "Qualified service instance (for example, 'SharePoint/Dublin') that published the service error information."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_appRoleAssignment = microsoft_graph_directoryObject.and(
  z
    .object({
      appRoleId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .describe(
          "The identifier (id) for the app role that's assigned to the principal. This app role must be exposed in the appRoles property on the resource application's service principal (resourceId). If the resource application hasn't declared any app roles, a default app role ID of 00000000-0000-0000-0000-000000000000 can be specified to signal that the principal is assigned to the resource app without any specific app roles. Required on create."
        ),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The time when the app role assignment was created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      principalDisplayName: z
        .string()
        .describe(
          'The display name of the user, group, or service principal that was granted the app role assignment. Maximum length is 256 characters. Read-only. Supports $filter (eq and startswith).'
        )
        .nullable(),
      principalId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .describe(
          'The unique identifier (id) for the user, security group, or service principal being granted the app role. Security groups with dynamic memberships are supported. Required on create.'
        )
        .nullable(),
      principalType: z
        .string()
        .describe(
          'The type of the assigned principal. This can either be User, Group, or ServicePrincipal. Read-only.'
        )
        .nullable(),
      resourceDisplayName: z
        .string()
        .describe(
          "The display name of the resource app's service principal to which the assignment is made. Maximum length is 256 characters."
        )
        .nullable(),
      resourceId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .describe(
          'The unique identifier (id) for the resource service principal for which the assignment is made. Required on create. Supports $filter (eq only).'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_onlineMeetingProviderType = z.enum([
  'unknown',
  'skypeForBusiness',
  'skypeForConsumer',
  'teamsForBusiness',
]);
const microsoft_graph_calendarColor = z.enum([
  'auto',
  'lightBlue',
  'lightGreen',
  'lightOrange',
  'lightGray',
  'lightYellow',
  'lightTeal',
  'lightPink',
  'lightBrown',
  'lightRed',
  'maxColor',
]);
const microsoft_graph_emailAddress = z
  .object({
    address: z.string().describe('The email address of the person or entity.').nullable(),
    name: z.string().describe('The display name of the person or entity.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_calendarRoleType = z.enum([
  'none',
  'freeBusyRead',
  'limitedRead',
  'read',
  'write',
  'delegateWithoutPrivateEventAccess',
  'delegateWithPrivateEventAccess',
  'custom',
]);
const microsoft_graph_calendarPermission = microsoft_graph_entity.and(
  z
    .object({
      allowedRoles: z
        .array(z.union([microsoft_graph_calendarRoleType, z.object({}).partial().strict()]))
        .describe(
          'List of allowed sharing or delegating permission levels for the calendar. Possible values are: none, freeBusyRead, limitedRead, read, write, delegateWithoutPrivateEventAccess, delegateWithPrivateEventAccess, custom.'
        ),
      emailAddress: z
        .union([microsoft_graph_emailAddress, z.object({}).partial().strict()])
        .describe(
          "Represents a share recipient or delegate who has access to the calendar. For the 'My Organization' share recipient, the address property is null. Read-only."
        ),
      isInsideOrganization: z
        .boolean()
        .describe(
          'True if the user in context (recipient or delegate) is inside the same organization as the calendar owner.'
        )
        .nullable(),
      isRemovable: z
        .boolean()
        .describe(
          "True if the user can be removed from the list of recipients or delegates for the specified calendar, false otherwise. The 'My organization' user determines the permissions other people within your organization have to the given calendar. You can't remove 'My organization' as a share recipient to a calendar."
        )
        .nullable(),
      role: z
        .union([microsoft_graph_calendarRoleType, z.object({}).partial().strict()])
        .describe('Current permission level of the calendar share recipient or delegate.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_outlookItem = microsoft_graph_entity.and(
  z
    .object({
      categories: z
        .array(z.string().nullable())
        .describe('The categories associated with the item'),
      changeKey: z
        .string()
        .describe(
          'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
        )
        .nullable(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_recipient = z
  .object({
    emailAddress: z
      .union([microsoft_graph_emailAddress, z.object({}).partial().strict()])
      .describe("The recipient's email address."),
  })
  .partial()
  .strict();
const microsoft_graph_attendeeType = z.enum(['required', 'optional', 'resource']);
const microsoft_graph_attendeeBase = microsoft_graph_recipient.and(
  z
    .object({
      type: z
        .union([microsoft_graph_attendeeType, z.object({}).partial().strict()])
        .describe(
          'The type of attendee. The possible values are: required, optional, resource. Currently if the attendee is a person, findMeetingTimes always considers the person is of the Required type.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_timeSlot = z
  .object({ end: microsoft_graph_dateTimeTimeZone, start: microsoft_graph_dateTimeTimeZone })
  .partial()
  .strict();
const microsoft_graph_responseType = z.enum([
  'none',
  'organizer',
  'tentativelyAccepted',
  'accepted',
  'declined',
  'notResponded',
]);
const microsoft_graph_responseStatus = z
  .object({
    response: z
      .union([microsoft_graph_responseType, z.object({}).partial().strict()])
      .describe(
        "The response type. Possible values are: none, organizer, tentativelyAccepted, accepted, declined, notResponded.To differentiate between none and notResponded:  none – from organizer's perspective. This value is used when the status of an attendee/participant is reported to the organizer of a meeting.  notResponded – from attendee's perspective. Indicates the attendee has not responded to the meeting request.  Clients can treat notResponded == none.  As an example, if attendee Alex hasn't responded to a meeting request, getting Alex' response status for that event in Alex' calendar returns notResponded. Getting Alex' response from the calendar of any other attendee or the organizer's returns none. Getting the organizer's response for the event in anybody's calendar also returns none."
      ),
    time: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time when the response was returned. It uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_attendee = microsoft_graph_attendeeBase.and(
  z
    .object({
      proposedNewTime: z
        .union([microsoft_graph_timeSlot, z.object({}).partial().strict()])
        .describe(
          "An alternate date/time proposed by the attendee for a meeting request to start and end. If the attendee hasn't proposed another time, then this property isn't included in a response of a GET event."
        ),
      status: z
        .union([microsoft_graph_responseStatus, z.object({}).partial().strict()])
        .describe(
          "The attendee's response (none, accepted, declined, etc.) for the event and date-time that the response was sent."
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_bodyType = z.enum(['text', 'html']);
const microsoft_graph_itemBody = z
  .object({
    content: z.string().describe('The content of the item.').nullable(),
    contentType: z
      .union([microsoft_graph_bodyType, z.object({}).partial().strict()])
      .describe('The type of the content. Possible values are text and html.'),
  })
  .partial()
  .strict();
const microsoft_graph_importance = z.enum(['low', 'normal', 'high']);
const microsoft_graph_physicalAddress = z
  .object({
    city: z.string().describe('The city.').nullable(),
    countryOrRegion: z
      .string()
      .describe(
        "The country or region. It's a free-format string value, for example, 'United States'."
      )
      .nullable(),
    postalCode: z.string().describe('The postal code.').nullable(),
    state: z.string().describe('The state.').nullable(),
    street: z.string().describe('The street.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_outlookGeoCoordinates = z
  .object({
    accuracy: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe(
        'The accuracy of the latitude and longitude. As an example, the accuracy can be measured in meters, such as the latitude and longitude are accurate to within 50 meters.'
      ),
    altitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The altitude of the location.'),
    altitudeAccuracy: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The accuracy of the altitude.'),
    latitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The latitude of the location.'),
    longitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The longitude of the location.'),
  })
  .partial()
  .strict();
const microsoft_graph_locationType = z.enum([
  'default',
  'conferenceRoom',
  'homeAddress',
  'businessAddress',
  'geoCoordinates',
  'streetAddress',
  'hotel',
  'restaurant',
  'localBusiness',
  'postalAddress',
]);
const microsoft_graph_locationUniqueIdType = z.enum([
  'unknown',
  'locationStore',
  'directory',
  'private',
  'bing',
]);
const microsoft_graph_location = z
  .object({
    address: z
      .union([microsoft_graph_physicalAddress, z.object({}).partial().strict()])
      .describe('The street address of the location.'),
    coordinates: z
      .union([microsoft_graph_outlookGeoCoordinates, z.object({}).partial().strict()])
      .describe('The geographic coordinates and elevation of the location.'),
    displayName: z.string().describe('The name associated with the location.').nullable(),
    locationEmailAddress: z.string().describe('Optional email address of the location.').nullable(),
    locationType: z
      .union([microsoft_graph_locationType, z.object({}).partial().strict()])
      .describe(
        'The type of location. The possible values are: default, conferenceRoom, homeAddress, businessAddress,geoCoordinates, streetAddress, hotel, restaurant, localBusiness, postalAddress. Read-only.'
      ),
    locationUri: z.string().describe('Optional URI representing the location.').nullable(),
    uniqueId: z.string().describe('For internal use only.').nullable(),
    uniqueIdType: z
      .union([microsoft_graph_locationUniqueIdType, z.object({}).partial().strict()])
      .describe('For internal use only.'),
  })
  .partial()
  .strict();
const microsoft_graph_phoneType = z.enum([
  'home',
  'business',
  'mobile',
  'other',
  'assistant',
  'homeFax',
  'businessFax',
  'otherFax',
  'pager',
  'radio',
]);
const microsoft_graph_phone = z
  .object({
    language: z.string().nullable(),
    number: z.string().describe('The phone number.').nullable(),
    region: z.string().nullable(),
    type: z
      .union([microsoft_graph_phoneType, z.object({}).partial().strict()])
      .describe(
        'The type of phone number. The possible values are: home, business, mobile, other, assistant, homeFax, businessFax, otherFax, pager, radio.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_onlineMeetingInfo = z
  .object({
    conferenceId: z.string().describe('The ID of the conference.').nullable(),
    joinUrl: z
      .string()
      .describe(
        'The external link that launches the online meeting. This is a URL that clients launch into a browser and will redirect the user to join the meeting.'
      )
      .nullable(),
    phones: z
      .array(microsoft_graph_phone)
      .describe('All of the phone numbers associated with this conference.'),
    quickDial: z.string().describe('The preformatted quick dial for this call.').nullable(),
    tollFreeNumbers: z
      .array(z.string().nullable())
      .describe('The toll free numbers that can be used to join the conference.'),
    tollNumber: z
      .string()
      .describe('The toll number that can be used to join the conference.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_weekIndex = z.enum(['first', 'second', 'third', 'fourth', 'last']);
const microsoft_graph_recurrencePatternType = z.enum([
  'daily',
  'weekly',
  'absoluteMonthly',
  'relativeMonthly',
  'absoluteYearly',
  'relativeYearly',
]);
const microsoft_graph_recurrencePattern = z
  .object({
    dayOfMonth: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The day of the month on which the event occurs. Required if type is absoluteMonthly or absoluteYearly.'
      ),
    daysOfWeek: z
      .array(z.union([microsoft_graph_dayOfWeek, z.object({}).partial().strict()]))
      .describe(
        'A collection of the days of the week on which the event occurs. The possible values are: sunday, monday, tuesday, wednesday, thursday, friday, saturday. If type is relativeMonthly or relativeYearly, and daysOfWeek specifies more than one day, the event falls on the first day that satisfies the pattern.  Required if type is weekly, relativeMonthly, or relativeYearly.'
      ),
    firstDayOfWeek: z
      .union([microsoft_graph_dayOfWeek, z.object({}).partial().strict()])
      .describe(
        'The first day of the week. The possible values are: sunday, monday, tuesday, wednesday, thursday, friday, saturday. Default is sunday. Required if type is weekly.'
      ),
    index: z
      .union([microsoft_graph_weekIndex, z.object({}).partial().strict()])
      .describe(
        'Specifies on which instance of the allowed days specified in daysOfWeek the event occurs, counted from the first instance in the month. The possible values are: first, second, third, fourth, last. Default is first. Optional and used if type is relativeMonthly or relativeYearly.'
      ),
    interval: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The number of units between occurrences, where units can be in days, weeks, months, or years, depending on the type. Required.'
      ),
    month: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The month in which the event occurs.  This is a number from 1 to 12.'),
    type: z
      .union([microsoft_graph_recurrencePatternType, z.object({}).partial().strict()])
      .describe(
        'The recurrence pattern type: daily, weekly, absoluteMonthly, relativeMonthly, absoluteYearly, relativeYearly. Required. For more information, see values of type property.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_recurrenceRangeType = z.enum(['endDate', 'noEnd', 'numbered']);
const microsoft_graph_recurrenceRange = z
  .object({
    endDate: z
      .string()
      .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
      .describe(
        'The date to stop applying the recurrence pattern. Depending on the recurrence pattern of the event, the last occurrence of the meeting may not be this date. Required if type is endDate.'
      )
      .nullable(),
    numberOfOccurrences: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The number of times to repeat the event. Required and must be positive if type is numbered.'
      ),
    recurrenceTimeZone: z
      .string()
      .describe(
        'Time zone for the startDate and endDate properties. Optional. If not specified, the time zone of the event is used.'
      )
      .nullable(),
    startDate: z
      .string()
      .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
      .describe(
        'The date to start applying the recurrence pattern. The first occurrence of the meeting may be this date or later, depending on the recurrence pattern of the event. Must be the same value as the start property of the recurring event. Required.'
      )
      .nullable(),
    type: z
      .union([microsoft_graph_recurrenceRangeType, z.object({}).partial().strict()])
      .describe(
        'The recurrence range. The possible values are: endDate, noEnd, numbered. Required.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_patternedRecurrence = z
  .object({
    pattern: z
      .union([microsoft_graph_recurrencePattern, z.object({}).partial().strict()])
      .describe(
        'The frequency of an event.  For access reviews: Do not specify this property for a one-time access review.  Only interval, dayOfMonth, and type (weekly, absoluteMonthly) properties of recurrencePattern are supported.'
      ),
    range: z
      .union([microsoft_graph_recurrenceRange, z.object({}).partial().strict()])
      .describe('The duration of an event.'),
  })
  .partial()
  .strict();
const microsoft_graph_sensitivity = z.enum(['normal', 'personal', 'private', 'confidential']);
const microsoft_graph_freeBusyStatus = z.enum([
  'unknown',
  'free',
  'tentative',
  'busy',
  'oof',
  'workingElsewhere',
]);
const microsoft_graph_eventType = z.enum([
  'singleInstance',
  'occurrence',
  'exception',
  'seriesMaster',
]);
const microsoft_graph_attachment = microsoft_graph_entity.and(
  z
    .object({
      contentType: z.string().describe('The MIME type.').nullable(),
      isInline: z
        .boolean()
        .describe('true if the attachment is an inline attachment; otherwise, false.'),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      name: z.string().describe("The attachment's file name.").nullable(),
      size: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The length of the attachment in bytes.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_extension = microsoft_graph_entity.and(z.object({}).partial().strict());
const microsoft_graph_multiValueLegacyExtendedProperty = microsoft_graph_entity.and(
  z
    .object({ value: z.array(z.string().nullable()).describe('A collection of property values.') })
    .partial()
    .strict()
);
const microsoft_graph_singleValueLegacyExtendedProperty = microsoft_graph_entity.and(
  z
    .object({ value: z.string().describe('A property value.').nullable() })
    .partial()
    .strict()
);
const microsoft_graph_event: z.ZodType<microsoft_graph_event> = z.lazy(() =>
  microsoft_graph_outlookItem.and(
    z
      .object({
        allowNewTimeProposals: z
          .boolean()
          .describe(
            'true if the meeting organizer allows invitees to propose a new time when responding; otherwise, false. Optional. The default is true.'
          )
          .nullable(),
        attendees: z
          .array(microsoft_graph_attendee)
          .describe('The collection of attendees for the event.'),
        body: z
          .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
          .describe(
            'The body of the message associated with the event. It can be in HTML or text format.'
          ),
        bodyPreview: z
          .string()
          .describe("The preview of the message associated with the event. It's in text format.")
          .nullable(),
        cancelledOccurrences: z
          .array(z.string())
          .describe(
            'Contains occurrenceId property values of canceled instances in a recurring series, if the event is the series master. Instances in a recurring series that are canceled are called canceled occurences.Returned only on $select in a Get operation which specifies the ID (seriesMasterId property value) of a series master event.'
          ),
        end: z
          .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
          .describe(
            'The date, time, and time zone that the event ends. By default, the end time is in UTC.'
          ),
        hasAttachments: z
          .boolean()
          .describe('Set to true if the event has attachments.')
          .nullable(),
        hideAttendees: z
          .boolean()
          .describe(
            'When set to true, each attendee only sees themselves in the meeting request and meeting Tracking list. The default is false.'
          )
          .nullable(),
        iCalUId: z
          .string()
          .describe(
            'A unique identifier for an event across calendars. This ID is different for each occurrence in a recurring series. Read-only.'
          )
          .nullable(),
        importance: z
          .union([microsoft_graph_importance, z.object({}).partial().strict()])
          .describe('The importance of the event. The possible values are: low, normal, high.'),
        isAllDay: z
          .boolean()
          .describe(
            "Set to true if the event lasts all day. If true, regardless of whether it's a single-day or multi-day event, start, and endtime must be set to midnight and be in the same time zone."
          )
          .nullable(),
        isCancelled: z.boolean().describe('Set to true if the event has been canceled.').nullable(),
        isDraft: z
          .boolean()
          .describe(
            "Set to true if the user has updated the meeting in Outlook but hasn't sent the updates to attendees. Set to false if all changes are sent, or if the event is an appointment without any attendees."
          )
          .nullable(),
        isOnlineMeeting: z
          .boolean()
          .describe(
            'True if this event has online meeting information (that is, onlineMeeting points to an onlineMeetingInfo resource), false otherwise. Default is false (onlineMeeting is null). Optional.  After you set isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting. Subsequently, Outlook ignores any further changes to isOnlineMeeting, and the meeting remains available online.'
          )
          .nullable(),
        isOrganizer: z
          .boolean()
          .describe(
            'Set to true if the calendar owner (specified by the owner property of the calendar) is the organizer of the event (specified by the organizer property of the event). It also applies if a delegate organized the event on behalf of the owner.'
          )
          .nullable(),
        isReminderOn: z
          .boolean()
          .describe('Set to true if an alert is set to remind the user of the event.')
          .nullable(),
        location: z
          .union([microsoft_graph_location, z.object({}).partial().strict()])
          .describe('The location of the event.'),
        locations: z
          .array(microsoft_graph_location)
          .describe(
            'The locations where the event is held or attended from. The location and locations properties always correspond with each other. If you update the location property, any prior locations in the locations collection are removed and replaced by the new location value.'
          ),
        onlineMeeting: z
          .union([microsoft_graph_onlineMeetingInfo, z.object({}).partial().strict()])
          .describe(
            "Details for an attendee to join the meeting online. The default is null. Read-only. After you set the isOnlineMeeting and onlineMeetingProvider properties to enable a meeting online, Microsoft Graph initializes onlineMeeting. When set, the meeting remains available online, and you can't change the isOnlineMeeting, onlineMeetingProvider, and onlneMeeting properties again."
          ),
        onlineMeetingProvider: z
          .union([microsoft_graph_onlineMeetingProviderType, z.object({}).partial().strict()])
          .describe(
            "Represents the online meeting service provider. By default, onlineMeetingProvider is unknown. The possible values are unknown, teamsForBusiness, skypeForBusiness, and skypeForConsumer. Optional.  After you set onlineMeetingProvider, Microsoft Graph initializes onlineMeeting. Subsequently, you can't change onlineMeetingProvider again, and the meeting remains available online."
          ),
        onlineMeetingUrl: z
          .string()
          .describe(
            'A URL for an online meeting. The property is set only when an organizer specifies in Outlook that an event is an online meeting such as Skype. Read-only.To access the URL to join an online meeting, use joinUrl which is exposed via the onlineMeeting property of the event. The onlineMeetingUrl property will be deprecated in the future.'
          )
          .nullable(),
        organizer: z
          .union([microsoft_graph_recipient, z.object({}).partial().strict()])
          .describe('The organizer of the event.'),
        originalEndTimeZone: z
          .string()
          .describe(
            'The end time zone that was set when the event was created. A value of tzone://Microsoft/Custom indicates that a legacy custom time zone was set in desktop Outlook.'
          )
          .nullable(),
        originalStart: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "Represents the start time of an event when it's initially created as an occurrence or exception in a recurring series. This property is not returned for events that are single instances. Its date and time information is expressed in ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
          )
          .nullable(),
        originalStartTimeZone: z
          .string()
          .describe(
            'The start time zone that was set when the event was created. A value of tzone://Microsoft/Custom indicates that a legacy custom time zone was set in desktop Outlook.'
          )
          .nullable(),
        recurrence: z
          .union([microsoft_graph_patternedRecurrence, z.object({}).partial().strict()])
          .describe('The recurrence pattern for the event.'),
        reminderMinutesBeforeStart: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe(
            'The number of minutes before the event start time that the reminder alert occurs.'
          )
          .nullable(),
        responseRequested: z
          .boolean()
          .describe(
            'Default is true, which represents the organizer would like an invitee to send a response to the event.'
          )
          .nullable(),
        responseStatus: z
          .union([microsoft_graph_responseStatus, z.object({}).partial().strict()])
          .describe('Indicates the type of response sent in response to an event message.'),
        sensitivity: z
          .union([microsoft_graph_sensitivity, z.object({}).partial().strict()])
          .describe('Possible values are: normal, personal, private, and confidential.'),
        seriesMasterId: z
          .string()
          .describe(
            'The ID for the recurring series master item, if this event is part of a recurring series.'
          )
          .nullable(),
        showAs: z
          .union([microsoft_graph_freeBusyStatus, z.object({}).partial().strict()])
          .describe(
            'The status to show. Possible values are: free, tentative, busy, oof, workingElsewhere, unknown.'
          ),
        start: z
          .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
          .describe(
            'The start date, time, and time zone of the event. By default, the start time is in UTC.'
          ),
        subject: z.string().describe("The text of the event's subject line.").nullable(),
        transactionId: z
          .string()
          .describe(
            "A custom identifier specified by a client app for the server to avoid redundant POST operations in case of client retries to create the same event. It's useful when low network connectivity causes the client to time out before receiving a response from the server for the client's prior create-event request. After you set transactionId when creating an event, you can't change transactionId in a subsequent update. This property is only returned in a response payload if an app has set it. Optional."
          )
          .nullable(),
        type: z
          .union([microsoft_graph_eventType, z.object({}).partial().strict()])
          .describe(
            'The event type. Possible values are: singleInstance, occurrence, exception, seriesMaster. Read-only'
          ),
        webLink: z
          .string()
          .describe(
            "The URL to open the event in Outlook on the web.Outlook on the web opens the event in the browser if you are signed in to your mailbox. Otherwise, Outlook on the web prompts you to sign in.This URL can't be accessed from within an iFrame."
          )
          .nullable(),
        attachments: z
          .array(microsoft_graph_attachment)
          .describe(
            'The collection of FileAttachment, ItemAttachment, and referenceAttachment attachments for the event. Navigation property. Read-only. Nullable.'
          ),
        calendar: z
          .union([microsoft_graph_calendar, z.object({}).partial().strict()])
          .describe('The calendar that contains the event. Navigation property. Read-only.'),
        exceptionOccurrences: z
          .array(microsoft_graph_event)
          .describe(
            "Contains the id property values of the event instances that are exceptions in a recurring series.Exceptions can differ from other occurrences in a recurring series, such as the subject, start or end times, or attendees. Exceptions don't include canceled occurrences.Returned only on $select and $expand in a GET operation that specifies the ID (seriesMasterId property value) of a series master event."
          ),
        extensions: z
          .array(microsoft_graph_extension)
          .describe('The collection of open extensions defined for the event. Nullable.'),
        instances: z
          .array(microsoft_graph_event)
          .describe(
            "The occurrences of a recurring series, if the event is a series master. This property includes occurrences that are part of the recurrence pattern, and exceptions modified, but doesn't include occurrences canceled from the series. Navigation property. Read-only. Nullable."
          ),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .describe(
            'The collection of multi-value extended properties defined for the event. Read-only. Nullable.'
          ),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .describe(
            'The collection of single-value extended properties defined for the event. Read-only. Nullable.'
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_calendar: z.ZodType<microsoft_graph_calendar> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        allowedOnlineMeetingProviders: z
          .array(
            z.union([microsoft_graph_onlineMeetingProviderType, z.object({}).partial().strict()])
          )
          .describe(
            'Represent the online meeting service providers that can be used to create online meetings in this calendar. Possible values are: unknown, skypeForBusiness, skypeForConsumer, teamsForBusiness.'
          ),
        canEdit: z
          .boolean()
          .describe(
            'true if the user can write to the calendar, false otherwise. This property is true for the user who created the calendar. This property is also true for a user who shared a calendar and granted write access.'
          )
          .nullable(),
        canShare: z
          .boolean()
          .describe(
            'true if the user has permission to share the calendar, false otherwise. Only the user who created the calendar can share it.'
          )
          .nullable(),
        canViewPrivateItems: z
          .boolean()
          .describe(
            'If true, the user can read calendar items that have been marked private, false otherwise.'
          )
          .nullable(),
        changeKey: z
          .string()
          .describe(
            'Identifies the version of the calendar object. Every time the calendar is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
          )
          .nullable(),
        color: z
          .union([microsoft_graph_calendarColor, z.object({}).partial().strict()])
          .describe(
            'Specifies the color theme to distinguish the calendar from other calendars in a UI. The property values are: auto, lightBlue, lightGreen, lightOrange, lightGray, lightYellow, lightTeal, lightPink, lightBrown, lightRed, maxColor.'
          ),
        defaultOnlineMeetingProvider: z
          .union([microsoft_graph_onlineMeetingProviderType, z.object({}).partial().strict()])
          .describe(
            'The default online meeting provider for meetings sent from this calendar. Possible values are: unknown, skypeForBusiness, skypeForConsumer, teamsForBusiness.'
          ),
        hexColor: z
          .string()
          .describe(
            'The calendar color, expressed in a hex color code of three hexadecimal values, each ranging from 00 to FF and representing the red, green, or blue components of the color in the RGB color space. If the user has never explicitly set a color for the calendar, this property is empty. Read-only.'
          )
          .nullable(),
        isDefaultCalendar: z
          .boolean()
          .describe(
            'true if this is the default calendar where new events are created by default, false otherwise.'
          )
          .nullable(),
        isRemovable: z
          .boolean()
          .describe('Indicates whether this user calendar can be deleted from the user mailbox.')
          .nullable(),
        isTallyingResponses: z
          .boolean()
          .describe(
            "Indicates whether this user calendar supports tracking of meeting responses. Only meeting invites sent from users' primary calendars support tracking of meeting responses."
          )
          .nullable(),
        name: z.string().describe('The calendar name.').nullable(),
        owner: z
          .union([microsoft_graph_emailAddress, z.object({}).partial().strict()])
          .describe(
            'If set, this represents the user who created or added the calendar. For a calendar that the user created or added, the owner property is set to the user. For a calendar shared with the user, the owner property is set to the person who shared that calendar with the user.'
          ),
        calendarPermissions: z
          .array(microsoft_graph_calendarPermission)
          .describe('The permissions of the users with whom the calendar is shared.'),
        calendarView: z
          .array(microsoft_graph_event)
          .describe('The calendar view for the calendar. Navigation property. Read-only.'),
        events: z
          .array(microsoft_graph_event)
          .describe('The events in the calendar. Navigation property. Read-only.'),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .describe(
            'The collection of multi-value extended properties defined for the calendar. Read-only. Nullable.'
          ),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .describe(
            'The collection of single-value extended properties defined for the calendar. Read-only. Nullable.'
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_post: z.ZodType<microsoft_graph_post> = z.lazy(() =>
  microsoft_graph_outlookItem.and(
    z
      .object({
        body: z
          .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
          .describe(
            'The contents of the post. This is a default property. This property can be null.'
          ),
        conversationId: z.string().describe('Unique ID of the conversation. Read-only.').nullable(),
        conversationThreadId: z
          .string()
          .describe('Unique ID of the conversation thread. Read-only.')
          .nullable(),
        from: microsoft_graph_recipient,
        hasAttachments: z
          .boolean()
          .describe(
            'Indicates whether the post has at least one attachment. This is a default property.'
          ),
        newParticipants: z
          .array(microsoft_graph_recipient)
          .describe(
            'Conversation participants that were added to the thread as part of this post.'
          ),
        receivedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Specifies when the post was received. The DateTimeOffset type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
          ),
        sender: z
          .union([microsoft_graph_recipient, z.object({}).partial().strict()])
          .describe(
            'Contains the address of the sender. The value of Sender is assumed to be the address of the authenticated user in the case when Sender is not specified. This is a default property.'
          ),
        attachments: z
          .array(microsoft_graph_attachment)
          .describe('Read-only. Nullable. Supports $expand.'),
        extensions: z
          .array(microsoft_graph_extension)
          .describe(
            'The collection of open extensions defined for the post. Read-only. Nullable. Supports $expand.'
          ),
        inReplyTo: z
          .union([microsoft_graph_post, z.object({}).partial().strict()])
          .describe('Read-only. Supports $expand.'),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .describe(
            'The collection of multi-value extended properties defined for the post. Read-only. Nullable.'
          ),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .describe(
            'The collection of single-value extended properties defined for the post. Read-only. Nullable.'
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_conversationThread = microsoft_graph_entity.and(
  z
    .object({
      ccRecipients: z
        .array(microsoft_graph_recipient)
        .describe('The Cc: recipients for the thread. Returned only on $select.'),
      hasAttachments: z
        .boolean()
        .describe(
          'Indicates whether any of the posts within this thread has at least one attachment. Returned by default.'
        ),
      isLocked: z.boolean().describe('Indicates if the thread is locked. Returned by default.'),
      lastDeliveredDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.Returned by default.'
        ),
      preview: z
        .string()
        .describe(
          'A short summary from the body of the latest post in this conversation. Returned by default.'
        ),
      topic: z
        .string()
        .describe(
          'The topic of the conversation. This property can be set when the conversation is created, but it cannot be updated. Returned by default.'
        ),
      toRecipients: z
        .array(microsoft_graph_recipient)
        .describe('The To: recipients for the thread. Returned only on $select.'),
      uniqueSenders: z
        .array(z.string())
        .describe('All the users that sent a message to this thread. Returned by default.'),
      posts: z.array(microsoft_graph_post),
    })
    .partial()
    .strict()
);
const microsoft_graph_conversation = microsoft_graph_entity.and(
  z
    .object({
      hasAttachments: z
        .boolean()
        .describe(
          'Indicates whether any of the posts within this Conversation has at least one attachment. Supports $filter (eq, ne) and $search.'
        ),
      lastDeliveredDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        ),
      preview: z
        .string()
        .describe(
          'A short summary from the body of the latest post in this conversation. Supports $filter (eq, ne, le, ge).'
        ),
      topic: z
        .string()
        .describe(
          'The topic of the conversation. This property can be set when the conversation is created, but it cannot be updated.'
        ),
      uniqueSenders: z
        .array(z.string())
        .describe('All the users that sent a message to this Conversation.'),
      threads: z
        .array(microsoft_graph_conversationThread)
        .describe(
          'A collection of all the conversation threads in the conversation. A navigation property. Read-only. Nullable.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_storagePlanInformation = z
  .object({
    upgradeAvailable: z
      .boolean()
      .describe('Indicates whether there are higher storage quota plans available. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_quota = z
  .object({
    deleted: z
      .number()
      .describe('Total space consumed by files in the recycle bin, in bytes. Read-only.')
      .nullable(),
    remaining: z
      .number()
      .describe('Total space remaining before reaching the capacity limit, in bytes. Read-only.')
      .nullable(),
    state: z
      .string()
      .describe('Enumeration value that indicates the state of the storage space. Read-only.')
      .nullable(),
    storagePlanInformation: z
      .union([microsoft_graph_storagePlanInformation, z.object({}).partial().strict()])
      .describe("Information about the drive's storage quota plans. Only in Personal OneDrive."),
    total: z.number().describe('Total allowed storage space, in bytes. Read-only.').nullable(),
    used: z.number().describe('Total space used, in bytes. Read-only.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_systemFacet = z.object({}).partial().strict();
const microsoft_graph_listInfo = z
  .object({
    contentTypesEnabled: z
      .boolean()
      .describe('If true, indicates that content types are enabled for this list.')
      .nullable(),
    hidden: z
      .boolean()
      .describe(
        "If true, indicates that the list isn't normally visible in the SharePoint user experience."
      )
      .nullable(),
    template: z
      .string()
      .describe(
        'An enumerated value that represents the base list template used in creating the list. Possible values include documentLibrary, genericList, task, survey, announcements, contacts, and more.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_booleanColumn = z.object({}).partial().strict();
const microsoft_graph_calculatedColumn = z
  .object({
    format: z
      .string()
      .describe(
        'For dateTime output types, the format of the value. Possible values are: dateOnly or dateTime.'
      )
      .nullable(),
    formula: z
      .string()
      .describe('The formula used to compute the value for this column.')
      .nullable(),
    outputType: z
      .string()
      .describe(
        'The output type used to format values in this column. Possible values are: boolean, currency, dateTime, number, or text.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_choiceColumn = z
  .object({
    allowTextEntry: z
      .boolean()
      .describe("If true, allows custom values that aren't in the configured choices.")
      .nullable(),
    choices: z
      .array(z.string().nullable())
      .describe('The list of values available for this column.'),
    displayAs: z
      .string()
      .describe(
        'How the choices are to be presented in the UX. Must be one of checkBoxes, dropDownMenu, or radioButtons'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_contentApprovalStatusColumn = z.object({}).partial().strict();
const microsoft_graph_currencyColumn = z
  .object({
    locale: z
      .string()
      .describe('Specifies the locale from which to infer the currency symbol.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_dateTimeColumn = z
  .object({
    displayAs: z
      .string()
      .describe(
        'How the value should be presented in the UX. Must be one of default, friendly, or standard. See below for more details. If unspecified, treated as default.'
      )
      .nullable(),
    format: z
      .string()
      .describe(
        'Indicates whether the value should be presented as a date only or a date and time. Must be one of dateOnly or dateTime'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_defaultColumnValue = z
  .object({
    formula: z
      .string()
      .describe('The formula used to compute the default value for the column.')
      .nullable(),
    value: z
      .string()
      .describe('The direct value to use as the default value for the column.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_geolocationColumn = z.object({}).partial().strict();
const microsoft_graph_hyperlinkOrPictureColumn = z
  .object({
    isPicture: z
      .boolean()
      .describe(
        'Specifies whether the display format used for URL columns is an image or a hyperlink.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_lookupColumn = z
  .object({
    allowMultipleValues: z
      .boolean()
      .describe('Indicates whether multiple values can be selected from the source.')
      .nullable(),
    allowUnlimitedLength: z
      .boolean()
      .describe(
        'Indicates whether values in the column should be able to exceed the standard limit of 255 characters.'
      )
      .nullable(),
    columnName: z.string().describe('The name of the lookup source column.').nullable(),
    listId: z.string().describe('The unique identifier of the lookup source list.').nullable(),
    primaryLookupColumnId: z
      .string()
      .describe(
        'If specified, this column is a secondary lookup, pulling an additional field from the list item looked up by the primary lookup. Use the list item looked up by the primary as the source for the column named here.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_numberColumn = z
  .object({
    decimalPlaces: z
      .string()
      .describe(
        'How many decimal places to display. See below for information about the possible values.'
      )
      .nullable(),
    displayAs: z
      .string()
      .describe(
        'How the value should be presented in the UX. Must be one of number or percentage. If unspecified, treated as number.'
      )
      .nullable(),
    maximum: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The maximum permitted value.'),
    minimum: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The minimum permitted value.'),
  })
  .partial()
  .strict();
const microsoft_graph_personOrGroupColumn = z
  .object({
    allowMultipleSelection: z
      .boolean()
      .describe('Indicates whether multiple values can be selected from the source.')
      .nullable(),
    chooseFromType: z
      .string()
      .describe(
        'Whether to allow selection of people only, or people and groups. Must be one of peopleAndGroups or peopleOnly.'
      )
      .nullable(),
    displayAs: z
      .string()
      .describe('How to display the information about the person or group chosen. See below.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_contentTypeInfo = z
  .object({
    id: z.string().describe('The ID of the content type.').nullable(),
    name: z.string().describe('The name of the content type.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_termStore_localizedDescription = z
  .object({
    description: z.string().describe('The description in the localized language.').nullable(),
    languageTag: z.string().describe('The language tag for the label.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_termStore_localizedLabel = z
  .object({
    isDefault: z.boolean().describe('Indicates whether the label is the default label.').nullable(),
    languageTag: z.string().describe('The language tag for the label.').nullable(),
    name: z.string().describe('The name of the label.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_keyValue = z
  .object({
    key: z.string().describe('Key for the key-value pair.').nullable(),
    value: z.string().describe('Value for the key-value pair.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_termStore_relationType = z.enum(['pin', 'reuse', 'unknownFutureValue']);
const microsoft_graph_termStore_localizedName = z
  .object({
    languageTag: z.string().describe('The language tag for the label.').nullable(),
    name: z.string().describe('The name in the localized language.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_termStore_termGroupScope = z.enum([
  'global',
  'system',
  'siteCollection',
  'unknownFutureValue',
]);
const microsoft_graph_termStore_group: z.ZodType<microsoft_graph_termStore_group> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Date and time of the group creation. Read-only.')
          .nullable(),
        description: z
          .string()
          .describe('Description that gives details on the term usage.')
          .nullable(),
        displayName: z.string().describe('Name of the group.').nullable(),
        parentSiteId: z.string().describe('ID of the parent site of this group.').nullable(),
        scope: z
          .union([microsoft_graph_termStore_termGroupScope, z.object({}).partial().strict()])
          .describe(
            'Returns the type of the group. Possible values are: global, system, and siteCollection.'
          ),
        sets: z
          .array(microsoft_graph_termStore_set)
          .describe('All sets under the group in a term [store].'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_termStore_set: z.ZodType<microsoft_graph_termStore_set> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Date and time of set creation. Read-only.')
          .nullable(),
        description: z
          .string()
          .describe('Description that gives details on the term usage.')
          .nullable(),
        localizedNames: z
          .array(microsoft_graph_termStore_localizedName)
          .describe('Name of the set for each languageTag.'),
        properties: z.array(microsoft_graph_keyValue).describe('Custom properties for the set.'),
        children: z
          .array(microsoft_graph_termStore_term)
          .describe('Children terms of set in term [store].'),
        parentGroup: microsoft_graph_termStore_group,
        relations: z
          .array(microsoft_graph_termStore_relation)
          .describe('Indicates which terms have been pinned or reused directly under the set.'),
        terms: z.array(microsoft_graph_termStore_term).describe('All the terms under the set.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_termStore_relation: z.ZodType<microsoft_graph_termStore_relation> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          relationship: z
            .union([microsoft_graph_termStore_relationType, z.object({}).partial().strict()])
            .describe('The type of relation. Possible values are: pin, reuse.'),
          fromTerm: z
            .union([microsoft_graph_termStore_term, z.object({}).partial().strict()])
            .describe(
              'The from [term] of the relation. The term from which the relationship is defined. A null value would indicate the relation is directly with the [set].'
            ),
          set: z
            .union([microsoft_graph_termStore_set, z.object({}).partial().strict()])
            .describe('The [set] in which the relation is relevant.'),
          toTerm: z
            .union([microsoft_graph_termStore_term, z.object({}).partial().strict()])
            .describe(
              'The to [term] of the relation. The term to which the relationship is defined.'
            ),
        })
        .partial()
        .strict()
    )
);
const microsoft_graph_termStore_term: z.ZodType<microsoft_graph_termStore_term> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Date and time of term creation. Read-only.')
          .nullable(),
        descriptions: z
          .array(microsoft_graph_termStore_localizedDescription)
          .describe('Description about term that is dependent on the languageTag.'),
        labels: z
          .array(microsoft_graph_termStore_localizedLabel)
          .describe('Label metadata for a term.'),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Last date and time of term modification. Read-only.')
          .nullable(),
        properties: z
          .array(microsoft_graph_keyValue)
          .describe('Collection of properties on the term.'),
        children: z.array(microsoft_graph_termStore_term).describe('Children of current term.'),
        relations: z
          .array(microsoft_graph_termStore_relation)
          .describe(
            'To indicate which terms are related to the current term as either pinned or reused.'
          ),
        set: z
          .union([microsoft_graph_termStore_set, z.object({}).partial().strict()])
          .describe('The [set] in which the term is created.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_termColumn = z
  .object({
    allowMultipleValues: z
      .boolean()
      .describe('Specifies whether the column allows more than one value.')
      .nullable(),
    showFullyQualifiedName: z
      .boolean()
      .describe('Specifies whether to display the entire term path or only the term label.')
      .nullable(),
    parentTerm: z.union([microsoft_graph_termStore_term, z.object({}).partial().strict()]),
    termSet: z.union([microsoft_graph_termStore_set, z.object({}).partial().strict()]),
  })
  .partial()
  .strict();
const microsoft_graph_textColumn = z
  .object({
    allowMultipleLines: z.boolean().describe('Whether to allow multiple lines of text.').nullable(),
    appendChangesToExistingText: z
      .boolean()
      .describe('Whether updates to this column should replace existing text, or append to it.')
      .nullable(),
    linesForEditing: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The size of the text box.')
      .nullable(),
    maxLength: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The maximum number of characters for the value.')
      .nullable(),
    textType: z
      .string()
      .describe('The type of text being stored. Must be one of plain or richText')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_thumbnailColumn = z.object({}).partial().strict();
const microsoft_graph_columnTypes = z.enum([
  'note',
  'text',
  'choice',
  'multichoice',
  'number',
  'currency',
  'dateTime',
  'lookup',
  'boolean',
  'user',
  'url',
  'calculated',
  'location',
  'geolocation',
  'term',
  'multiterm',
  'thumbnail',
  'approvalStatus',
  'unknownFutureValue',
]);
const microsoft_graph_displayNameLocalization = z
  .object({
    displayName: z
      .string()
      .describe(
        'If present, the value of this field contains the displayName string that has been set for the language present in the languageTag field.'
      )
      .nullable(),
    languageTag: z
      .string()
      .describe(
        'Provides the language culture-code and friendly name of the language that the displayName field has been provided in.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_columnValidation = z
  .object({
    defaultLanguage: z
      .string()
      .describe('Default BCP 47 language tag for the description.')
      .nullable(),
    descriptions: z
      .array(microsoft_graph_displayNameLocalization)
      .describe(
        "Localized messages that explain what is needed for this column's value to be considered valid. User will be prompted with this message if validation fails."
      ),
    formula: z
      .string()
      .describe(
        'The formula to validate column value. For examples, see Examples of common formulas in lists.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_columnDefinition: z.ZodType<microsoft_graph_columnDefinition> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        boolean: z
          .union([microsoft_graph_booleanColumn, z.object({}).partial().strict()])
          .describe('This column stores Boolean values.'),
        calculated: z
          .union([microsoft_graph_calculatedColumn, z.object({}).partial().strict()])
          .describe("This column's data is calculated based on other columns."),
        choice: z
          .union([microsoft_graph_choiceColumn, z.object({}).partial().strict()])
          .describe('This column stores data from a list of choices.'),
        columnGroup: z
          .string()
          .describe(
            'For site columns, the name of the group this column belongs to. Helps organize related columns.'
          )
          .nullable(),
        contentApprovalStatus: z
          .union([microsoft_graph_contentApprovalStatusColumn, z.object({}).partial().strict()])
          .describe('This column stores content approval status.'),
        currency: z
          .union([microsoft_graph_currencyColumn, z.object({}).partial().strict()])
          .describe('This column stores currency values.'),
        dateTime: z
          .union([microsoft_graph_dateTimeColumn, z.object({}).partial().strict()])
          .describe('This column stores DateTime values.'),
        defaultValue: z
          .union([microsoft_graph_defaultColumnValue, z.object({}).partial().strict()])
          .describe('The default value for this column.'),
        description: z.string().describe('The user-facing description of the column.').nullable(),
        displayName: z.string().describe('The user-facing name of the column.').nullable(),
        enforceUniqueValues: z
          .boolean()
          .describe('If true, no two list items may have the same value for this column.')
          .nullable(),
        geolocation: z
          .union([microsoft_graph_geolocationColumn, z.object({}).partial().strict()])
          .describe('This column stores a geolocation.'),
        hidden: z
          .boolean()
          .describe('Specifies whether the column is displayed in the user interface.')
          .nullable(),
        hyperlinkOrPicture: z
          .union([microsoft_graph_hyperlinkOrPictureColumn, z.object({}).partial().strict()])
          .describe('This column stores hyperlink or picture values.'),
        indexed: z
          .boolean()
          .describe('Specifies whether the column values can be used for sorting and searching.')
          .nullable(),
        isDeletable: z
          .boolean()
          .describe('Indicates whether this column can be deleted.')
          .nullable(),
        isReorderable: z
          .boolean()
          .describe('Indicates whether values in the column can be reordered. Read-only.')
          .nullable(),
        isSealed: z.boolean().describe('Specifies whether the column can be changed.').nullable(),
        lookup: z
          .union([microsoft_graph_lookupColumn, z.object({}).partial().strict()])
          .describe("This column's data is looked up from another source in the site."),
        name: z
          .string()
          .describe(
            'The API-facing name of the column as it appears in the fields on a listItem. For the user-facing name, see displayName.'
          )
          .nullable(),
        number: z
          .union([microsoft_graph_numberColumn, z.object({}).partial().strict()])
          .describe('This column stores number values.'),
        personOrGroup: z
          .union([microsoft_graph_personOrGroupColumn, z.object({}).partial().strict()])
          .describe('This column stores Person or Group values.'),
        propagateChanges: z
          .boolean()
          .describe(
            "If 'true', changes to this column will be propagated to lists that implement the column."
          )
          .nullable(),
        readOnly: z
          .boolean()
          .describe('Specifies whether the column values can be modified.')
          .nullable(),
        required: z
          .boolean()
          .describe("Specifies whether the column value isn't optional.")
          .nullable(),
        sourceContentType: z
          .union([microsoft_graph_contentTypeInfo, z.object({}).partial().strict()])
          .describe(
            'ContentType from which this column is inherited from. Present only in contentTypes columns response. Read-only.'
          ),
        term: z
          .union([microsoft_graph_termColumn, z.object({}).partial().strict()])
          .describe('This column stores taxonomy terms.'),
        text: z
          .union([microsoft_graph_textColumn, z.object({}).partial().strict()])
          .describe('This column stores text values.'),
        thumbnail: z
          .union([microsoft_graph_thumbnailColumn, z.object({}).partial().strict()])
          .describe('This column stores thumbnail values.'),
        type: z
          .union([microsoft_graph_columnTypes, z.object({}).partial().strict()])
          .describe('For site columns, the type of column. Read-only.'),
        validation: z
          .union([microsoft_graph_columnValidation, z.object({}).partial().strict()])
          .describe('This column stores validation formula and message for the column.'),
        sourceColumn: z
          .union([microsoft_graph_columnDefinition, z.object({}).partial().strict()])
          .describe('The source column for the content type column.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_documentSetContent = z
  .object({
    contentType: z
      .union([microsoft_graph_contentTypeInfo, z.object({}).partial().strict()])
      .describe('Content type information of the file.'),
    fileName: z
      .string()
      .describe(
        'Name of the file in resource folder that should be added as a default content or a template in the document set.'
      )
      .nullable(),
    folderName: z
      .string()
      .describe(
        'Folder name in which the file will be placed when a new document set is created in the library.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_documentSet = z
  .object({
    allowedContentTypes: z
      .array(microsoft_graph_contentTypeInfo)
      .describe('Content types allowed in document set.'),
    defaultContents: z
      .array(microsoft_graph_documentSetContent)
      .describe('Default contents of document set.'),
    propagateWelcomePageChanges: z
      .boolean()
      .describe('Specifies whether to push welcome page changes to inherited content types.')
      .nullable(),
    shouldPrefixNameToFile: z
      .boolean()
      .describe('Indicates whether to add the name of the document set to each file name.')
      .nullable(),
    welcomePageUrl: z.string().describe('Welcome page absolute URL.').nullable(),
    sharedColumns: z.array(microsoft_graph_columnDefinition),
    welcomePageColumns: z.array(microsoft_graph_columnDefinition),
  })
  .partial()
  .strict();
const microsoft_graph_contentTypeOrder = z
  .object({
    default: z.boolean().describe('Indicates whether this is the default content type').nullable(),
    position: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Specifies the position in which the content type appears in the selection UI.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_columnLink = microsoft_graph_entity.and(
  z
    .object({
      name: z.string().describe('The name of the column  in this content type.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_contentType: z.ZodType<microsoft_graph_contentType> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        associatedHubsUrls: z
          .array(z.string().nullable())
          .describe(
            'List of canonical URLs for hub sites with which this content type is associated to. This will contain all hub sites where this content type is queued to be enforced or is already enforced. Enforcing a content type means that the content type is applied to the lists in the enforced sites.'
          ),
        description: z.string().describe('The descriptive text for the item.').nullable(),
        documentSet: z
          .union([microsoft_graph_documentSet, z.object({}).partial().strict()])
          .describe('Document Set metadata.'),
        documentTemplate: z
          .union([microsoft_graph_documentSetContent, z.object({}).partial().strict()])
          .describe(
            'Document template metadata. To make sure that documents have consistent content across a site and its subsites, you can associate a Word, Excel, or PowerPoint template with a site content type.'
          ),
        group: z
          .string()
          .describe(
            'The name of the group this content type belongs to. Helps organize related content types.'
          )
          .nullable(),
        hidden: z
          .boolean()
          .describe("Indicates whether the content type is hidden in the list's 'New' menu.")
          .nullable(),
        inheritedFrom: z
          .union([microsoft_graph_itemReference, z.object({}).partial().strict()])
          .describe(
            'If this content type is inherited from another scope (like a site), provides a reference to the item where the content type is defined.'
          ),
        isBuiltIn: z
          .boolean()
          .describe('Specifies if a content type is a built-in content type.')
          .nullable(),
        name: z.string().describe('The name of the content type.').nullable(),
        order: z
          .union([microsoft_graph_contentTypeOrder, z.object({}).partial().strict()])
          .describe('Specifies the order in which the content type appears in the selection UI.'),
        parentId: z.string().describe('The unique identifier of the content type.').nullable(),
        propagateChanges: z
          .boolean()
          .describe(
            'If true, any changes made to the content type are pushed to inherited content types and lists that implement the content type.'
          )
          .nullable(),
        readOnly: z
          .boolean()
          .describe(
            "If true, the content type can't be modified unless this value is first set to false."
          )
          .nullable(),
        sealed: z
          .boolean()
          .describe(
            "If true, the content type can't be modified by users or through push-down operations. Only site collection administrators can seal or unseal content types."
          )
          .nullable(),
        base: z
          .union([microsoft_graph_contentType, z.object({}).partial().strict()])
          .describe('Parent contentType from which this content type is derived.'),
        baseTypes: z
          .array(microsoft_graph_contentType)
          .describe('The collection of content types that are ancestors of this content type.'),
        columnLinks: z
          .array(microsoft_graph_columnLink)
          .describe('The collection of columns that are required by this content type.'),
        columnPositions: z
          .array(microsoft_graph_columnDefinition)
          .describe('Column order information in a content type.'),
        columns: z
          .array(microsoft_graph_columnDefinition)
          .describe('The collection of column definitions for this content type.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_itemActionStat = z
  .object({
    actionCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of times the action took place. Read-only.')
      .nullable(),
    actorCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of distinct actors that performed the action. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_incompleteData = z
  .object({
    missingDataBeforeDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The service does not have source data before the specified time.')
      .nullable(),
    wasThrottled: z
      .boolean()
      .describe('Some data was not recorded due to excessive activity.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_accessAction = z.object({}).partial().strict();
const microsoft_graph_itemActivity: z.ZodType<microsoft_graph_itemActivity> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        access: z
          .union([microsoft_graph_accessAction, z.object({}).partial().strict()])
          .describe('An item was accessed.'),
        activityDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Details about when the activity took place. Read-only.')
          .nullable(),
        actor: z
          .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
          .describe('Identity of who performed the action. Read-only.'),
        driveItem: z
          .union([microsoft_graph_driveItem, z.object({}).partial().strict()])
          .describe('Exposes the driveItem that was the target of this activity.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_itemActivityStat: z.ZodType<microsoft_graph_itemActivityStat> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        access: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().strict()])
          .describe('Statistics about the access actions in this interval. Read-only.'),
        create: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().strict()])
          .describe('Statistics about the create actions in this interval. Read-only.'),
        delete: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().strict()])
          .describe('Statistics about the delete actions in this interval. Read-only.'),
        edit: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().strict()])
          .describe('Statistics about the edit actions in this interval. Read-only.'),
        endDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('When the interval ends. Read-only.')
          .nullable(),
        incompleteData: z
          .union([microsoft_graph_incompleteData, z.object({}).partial().strict()])
          .describe(
            'Indicates that the statistics in this interval are based on incomplete data. Read-only.'
          ),
        isTrending: z
          .boolean()
          .describe("Indicates whether the item is 'trending.' Read-only.")
          .nullable(),
        move: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().strict()])
          .describe('Statistics about the move actions in this interval. Read-only.'),
        startDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('When the interval starts. Read-only.')
          .nullable(),
        activities: z
          .array(microsoft_graph_itemActivity)
          .describe('Exposes the itemActivities represented in this itemActivityStat resource.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_itemAnalytics: z.ZodType<microsoft_graph_itemAnalytics> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        allTime: z.union([microsoft_graph_itemActivityStat, z.object({}).partial().strict()]),
        itemActivityStats: z.array(microsoft_graph_itemActivityStat),
        lastSevenDays: z.union([microsoft_graph_itemActivityStat, z.object({}).partial().strict()]),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_publicationFacet = z
  .object({
    checkedOutBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
      .describe('The user who checked out the file.'),
    level: z
      .string()
      .describe(
        'The state of publication for this document. Either published or checkout. Read-only.'
      )
      .nullable(),
    versionId: z
      .string()
      .describe(
        'The unique identifier for the version that is visible to the current caller. Read-only.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_baseItemVersion = microsoft_graph_entity.and(
  z
    .object({
      lastModifiedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('Identity of the user which last modified the version. Read-only.'),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time the version was last modified. Read-only.')
        .nullable(),
      publication: z
        .union([microsoft_graph_publicationFacet, z.object({}).partial().strict()])
        .describe('Indicates the publication status of this particular version. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_fieldValueSet = microsoft_graph_entity.and(z.object({}).partial().strict());
const microsoft_graph_listItemVersion = microsoft_graph_baseItemVersion.and(
  z
    .object({
      fields: z
        .union([microsoft_graph_fieldValueSet, z.object({}).partial().strict()])
        .describe('A collection of the fields and values for this version of the list item.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_documentSetVersionItem = z
  .object({
    itemId: z.string().describe('The unique identifier for the item.').nullable(),
    title: z.string().describe('The title of the item.').nullable(),
    versionId: z.string().describe('The version ID of the item.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_documentSetVersion = microsoft_graph_listItemVersion.and(
  z
    .object({
      comment: z.string().describe('Comment about the captured version.').nullable(),
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('User who captured the version.'),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time when this version was created.')
        .nullable(),
      items: z
        .array(microsoft_graph_documentSetVersionItem)
        .describe('Items within the document set that are captured as part of this version.'),
      shouldCaptureMinorVersion: z
        .boolean()
        .describe(
          'If true, minor versions of items are also captured; otherwise, only major versions are captured. The default value is false.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_listItem: z.ZodType<microsoft_graph_listItem> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        contentType: z
          .union([microsoft_graph_contentTypeInfo, z.object({}).partial().strict()])
          .describe('The content type of this list item'),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().strict()])
          .describe('Returns identifiers useful for SharePoint REST compatibility. Read-only.'),
        analytics: z
          .union([microsoft_graph_itemAnalytics, z.object({}).partial().strict()])
          .describe('Analytics about the view activities that took place on this item.'),
        documentSetVersions: z
          .array(microsoft_graph_documentSetVersion)
          .describe('Version information for a document set version created by a user.'),
        driveItem: z
          .union([microsoft_graph_driveItem, z.object({}).partial().strict()])
          .describe(
            'For document libraries, the driveItem relationship exposes the listItem as a driveItem'
          ),
        fields: z
          .union([microsoft_graph_fieldValueSet, z.object({}).partial().strict()])
          .describe('The values of the columns set on this list item.'),
        versions: z
          .array(microsoft_graph_listItemVersion)
          .describe('The list of previous versions of the list item.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_longRunningOperationStatus = z.enum([
  'notStarted',
  'running',
  'succeeded',
  'failed',
  'unknownFutureValue',
]);
const microsoft_graph_longRunningOperation = microsoft_graph_entity.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The start time of the operation. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      lastActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The time of the last action in the operation. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      resourceLocation: z
        .string()
        .describe('URI of the resource that the operation is performed on.')
        .nullable(),
      status: z
        .union([microsoft_graph_longRunningOperationStatus, z.object({}).partial().strict()])
        .describe(
          'The status of the operation. The possible values are: notStarted, running, succeeded, failed, unknownFutureValue.'
        ),
      statusDetail: z.string().describe('Details about the status of the operation.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_publicErrorDetail = z
  .object({
    code: z.string().describe('The error code.').nullable(),
    message: z.string().describe('The error message.').nullable(),
    target: z.string().describe('The target of the error.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_publicInnerError = z
  .object({
    code: z.string().describe('The error code.').nullable(),
    details: z.array(microsoft_graph_publicErrorDetail).describe('A collection of error details.'),
    message: z.string().describe('The error message.').nullable(),
    target: z.string().describe('The target of the error.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_publicError = z
  .object({
    code: z.string().describe('Represents the error code.').nullable(),
    details: z.array(microsoft_graph_publicErrorDetail).describe('Details of the error.'),
    innerError: z
      .union([microsoft_graph_publicInnerError, z.object({}).partial().strict()])
      .describe('Details of the inner error.'),
    message: z.string().describe('A non-localized message for the developer.').nullable(),
    target: z.string().describe('The target of the error.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_richLongRunningOperation = microsoft_graph_longRunningOperation.and(
  z
    .object({
      error: z
        .union([microsoft_graph_publicError, z.object({}).partial().strict()])
        .describe('Error that caused the operation to fail.'),
      percentageComplete: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('A value between 0 and 100 that indicates the progress of the operation.')
        .nullable(),
      resourceId: z.string().describe('The unique identifier for the result.').nullable(),
      type: z.string().describe('The type of the operation.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_subscription = microsoft_graph_entity.and(
  z
    .object({
      applicationId: z
        .string()
        .describe(
          'Optional. Identifier of the application used to create the subscription. Read-only.'
        )
        .nullable(),
      changeType: z
        .string()
        .describe(
          'Required. Indicates the type of change in the subscribed resource that raises a change notification. The supported values are: created, updated, deleted. Multiple values can be combined using a comma-separated list. Note:  Drive root item and list change notifications support only the updated changeType. User and group change notifications support updated and deleted changeType. Use updated to receive notifications when user or group is created, updated, or soft deleted. Use deleted to receive notifications when user or group is permanently deleted.'
        ),
      clientState: z
        .string()
        .describe(
          'Optional. Specifies the value of the clientState property sent by the service in each change notification. The maximum length is 128 characters. The client can check that the change notification came from the service by comparing the value of the clientState property sent with the subscription with the value of the clientState property received with each change notification.'
        )
        .nullable(),
      creatorId: z
        .string()
        .describe(
          'Optional. Identifier of the user or service principal that created the subscription. If the app used delegated permissions to create the subscription, this field contains the ID of the signed-in user the app called on behalf of. If the app used application permissions, this field contains the ID of the service principal corresponding to the app. Read-only.'
        )
        .nullable(),
      encryptionCertificate: z
        .string()
        .describe(
          'Optional. A base64-encoded representation of a certificate with a public key used to encrypt resource data in change notifications. Optional but required when includeResourceData is true.'
        )
        .nullable(),
      encryptionCertificateId: z
        .string()
        .describe(
          'Optional. A custom app-provided identifier to help identify the certificate needed to decrypt resource data.'
        )
        .nullable(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Required. Specifies the date and time when the webhook subscription expires. The time is in UTC, and can be an amount of time from subscription creation that varies for the resource subscribed to. For the maximum supported subscription length of time, see Subscription lifetime.'
        ),
      includeResourceData: z
        .boolean()
        .describe(
          'Optional. When set to true, change notifications include resource data (such as content of a chat message).'
        )
        .nullable(),
      latestSupportedTlsVersion: z
        .string()
        .describe(
          'Optional. Specifies the latest version of Transport Layer Security (TLS) that the notification endpoint, specified by notificationUrl, supports. The possible values are: v10, v11, v12, v13. For subscribers whose notification endpoint supports a version lower than the currently recommended version (TLS 1.2), specifying this property by a set timeline allows them to temporarily use their deprecated version of TLS before completing their upgrade to TLS 1.2. For these subscribers, not setting this property per the timeline would result in subscription operations failing. For subscribers whose notification endpoint already supports TLS 1.2, setting this property is optional. In such cases, Microsoft Graph defaults the property to v1_2.'
        )
        .nullable(),
      lifecycleNotificationUrl: z
        .string()
        .describe(
          'Required for Teams resources if  the expirationDateTime value is more than 1 hour from now; optional otherwise. The URL of the endpoint that receives lifecycle notifications, including subscriptionRemoved, reauthorizationRequired, and missed notifications. This URL must make use of the HTTPS protocol. For more information, see Reduce missing subscriptions and change notifications.'
        )
        .nullable(),
      notificationQueryOptions: z
        .string()
        .describe(
          'Optional. OData query options for specifying value for the targeting resource. Clients receive notifications when resource reaches the state matching the query options provided here. With this new property in the subscription creation payload along with all existing properties, Webhooks deliver notifications whenever a resource reaches the desired state mentioned in the notificationQueryOptions property. For example, when the print job is completed or when a print job resource isFetchable property value becomes true etc.  Supported only for Universal Print Service. For more information, see Subscribe to change notifications from cloud printing APIs using Microsoft Graph.'
        )
        .nullable(),
      notificationUrl: z
        .string()
        .describe(
          'Required. The URL of the endpoint that receives the change notifications. This URL must make use of the HTTPS protocol. Any query string parameter included in the notificationUrl property is included in the HTTP POST request when Microsoft Graph sends the change notifications.'
        ),
      notificationUrlAppId: z
        .string()
        .describe(
          'Optional. The app ID that the subscription service can use to generate the validation token. The value allows the client to validate the authenticity of the notification received.'
        )
        .nullable(),
      resource: z
        .string()
        .describe(
          "Required. Specifies the resource that is monitored for changes. Don't include the base URL (https://graph.microsoft.com/v1.0/). See the possible resource path values for each supported resource."
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_list: z.ZodType<microsoft_graph_list> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        displayName: z.string().describe('The displayable title of the list.').nullable(),
        list: z
          .union([microsoft_graph_listInfo, z.object({}).partial().strict()])
          .describe('Contains more details about the list.'),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().strict()])
          .describe('Returns identifiers useful for SharePoint REST compatibility. Read-only.'),
        system: z
          .union([microsoft_graph_systemFacet, z.object({}).partial().strict()])
          .describe('If present, indicates that the list is system-managed. Read-only.'),
        columns: z
          .array(microsoft_graph_columnDefinition)
          .describe('The collection of field definitions for this list.'),
        contentTypes: z
          .array(microsoft_graph_contentType)
          .describe('The collection of content types present in this list.'),
        drive: z
          .union([microsoft_graph_drive, z.object({}).partial().strict()])
          .describe(
            'Allows access to the list as a drive resource with driveItems. Only present on document libraries.'
          ),
        items: z.array(microsoft_graph_listItem).describe('All items contained in the list.'),
        operations: z
          .array(microsoft_graph_richLongRunningOperation)
          .describe('The collection of long-running operations on the list.'),
        subscriptions: z
          .array(microsoft_graph_subscription)
          .describe('The set of subscriptions on the list.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_drive: z.ZodType<microsoft_graph_drive> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        driveType: z
          .string()
          .describe(
            'Describes the type of drive represented by this resource. OneDrive personal drives return personal. OneDrive for Business returns business. SharePoint document libraries return documentLibrary. Read-only.'
          )
          .nullable(),
        owner: z
          .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
          .describe('Optional. The user account that owns the drive. Read-only.'),
        quota: z
          .union([microsoft_graph_quota, z.object({}).partial().strict()])
          .describe("Optional. Information about the drive's storage space quota. Read-only."),
        sharePointIds: z.union([microsoft_graph_sharepointIds, z.object({}).partial().strict()]),
        system: z
          .union([microsoft_graph_systemFacet, z.object({}).partial().strict()])
          .describe("If present, indicates that it's a system-managed drive. Read-only."),
        bundles: z
          .array(microsoft_graph_driveItem)
          .describe(
            'Collection of bundles (albums and multi-select-shared sets of items). Only in personal OneDrive.'
          ),
        following: z
          .array(microsoft_graph_driveItem)
          .describe('The list of items the user is following. Only in OneDrive for Business.'),
        items: z
          .array(microsoft_graph_driveItem)
          .describe('All items contained in the drive. Read-only. Nullable.'),
        list: z
          .union([microsoft_graph_list, z.object({}).partial().strict()])
          .describe(
            'For drives in SharePoint, the underlying document library list. Read-only. Nullable.'
          ),
        root: z
          .union([microsoft_graph_driveItem, z.object({}).partial().strict()])
          .describe('The root folder of the drive. Read-only.'),
        special: z
          .array(microsoft_graph_driveItem)
          .describe('Collection of common folders available in OneDrive. Read-only. Nullable.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_groupLifecyclePolicy = microsoft_graph_entity.and(
  z
    .object({
      alternateNotificationEmails: z
        .string()
        .describe(
          'List of email address to send notifications for groups without owners. Multiple email address can be defined by separating email address with a semicolon.'
        )
        .nullable(),
      groupLifetimeInDays: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'Number of days before a group expires and needs to be renewed. Once renewed, the group expiration is extended by the number of days defined.'
        )
        .nullable(),
      managedGroupTypes: z
        .string()
        .describe(
          'The group type for which the expiration policy applies. Possible values are All, Selected or None.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_onenoteEntityBaseModel = microsoft_graph_entity.and(
  z
    .object({
      self: z
        .string()
        .describe('The endpoint where you can get details about the page. Read-only.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_onenoteEntitySchemaObjectModel = microsoft_graph_onenoteEntityBaseModel.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the page was created. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_onenoteEntityHierarchyModel =
  microsoft_graph_onenoteEntitySchemaObjectModel.and(
    z
      .object({
        createdBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
          .describe(
            'Identity of the user, device, and application that created the item. Read-only.'
          ),
        displayName: z.string().describe('The name of the notebook.').nullable(),
        lastModifiedBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
          .describe(
            'Identity of the user, device, and application that created the item. Read-only.'
          ),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The date and time when the notebook was last modified. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
          )
          .nullable(),
      })
      .partial()
      .strict()
  );
const microsoft_graph_externalLink = z
  .object({ href: z.string().describe('The URL of the link.').nullable() })
  .partial()
  .strict();
const microsoft_graph_notebookLinks = z
  .object({
    oneNoteClientUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().strict()])
      .describe("Opens the notebook in the OneNote native client if it's installed."),
    oneNoteWebUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().strict()])
      .describe('Opens the notebook in OneNote on the web.'),
  })
  .partial()
  .strict();
const microsoft_graph_onenoteUserRole = z.enum(['None', 'Owner', 'Contributor', 'Reader']);
const microsoft_graph_sectionLinks = z
  .object({
    oneNoteClientUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().strict()])
      .describe("Opens the section in the OneNote native client if it's installed."),
    oneNoteWebUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().strict()])
      .describe('Opens the section in OneNote on the web.'),
  })
  .partial()
  .strict();
const microsoft_graph_pageLinks = z
  .object({
    oneNoteClientUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().strict()])
      .describe("Opens the page in the OneNote native client if it's installed."),
    oneNoteWebUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().strict()])
      .describe('Opens the page in OneNote on the web.'),
  })
  .partial()
  .strict();
const microsoft_graph_onenotePage: z.ZodType<microsoft_graph_onenotePage> = z.lazy(() =>
  microsoft_graph_onenoteEntitySchemaObjectModel.and(
    z
      .object({
        content: z.string().describe("The page's HTML content.").nullable(),
        contentUrl: z
          .string()
          .describe("The URL for the page's HTML content.  Read-only.")
          .nullable(),
        createdByAppId: z
          .string()
          .describe('The unique identifier of the application that created the page. Read-only.')
          .nullable(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The date and time when the page was last modified. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
          )
          .nullable(),
        level: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe('The indentation level of the page. Read-only.')
          .nullable(),
        links: z
          .union([microsoft_graph_pageLinks, z.object({}).partial().strict()])
          .describe(
            "Links for opening the page. The oneNoteClientURL link opens the page in the OneNote native client if it 's installed. The oneNoteWebUrl link opens the page in OneNote on the web. Read-only."
          ),
        order: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe('The order of the page within its parent section. Read-only.')
          .nullable(),
        title: z.string().describe('The title of the page.').nullable(),
        userTags: z.array(z.string().nullable()),
        parentNotebook: z
          .union([microsoft_graph_notebook, z.object({}).partial().strict()])
          .describe('The notebook that contains the page.  Read-only.'),
        parentSection: z
          .union([microsoft_graph_onenoteSection, z.object({}).partial().strict()])
          .describe('The section that contains the page. Read-only.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_onenoteSection: z.ZodType<microsoft_graph_onenoteSection> = z.lazy(() =>
  microsoft_graph_onenoteEntityHierarchyModel.and(
    z
      .object({
        isDefault: z
          .boolean()
          .describe("Indicates whether this is the user's default section. Read-only.")
          .nullable(),
        links: z
          .union([microsoft_graph_sectionLinks, z.object({}).partial().strict()])
          .describe(
            "Links for opening the section. The oneNoteClientURL link opens the section in the OneNote native client if it's installed. The oneNoteWebURL link opens the section in OneNote on the web."
          ),
        pagesUrl: z
          .string()
          .describe(
            'The pages endpoint where you can get details for all the pages in the section. Read-only.'
          )
          .nullable(),
        pages: z
          .array(microsoft_graph_onenotePage)
          .describe('The collection of pages in the section.  Read-only. Nullable.'),
        parentNotebook: z
          .union([microsoft_graph_notebook, z.object({}).partial().strict()])
          .describe('The notebook that contains the section.  Read-only.'),
        parentSectionGroup: z
          .union([microsoft_graph_sectionGroup, z.object({}).partial().strict()])
          .describe('The section group that contains the section.  Read-only.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_sectionGroup: z.ZodType<microsoft_graph_sectionGroup> = z.lazy(() =>
  microsoft_graph_onenoteEntityHierarchyModel.and(
    z
      .object({
        sectionGroupsUrl: z
          .string()
          .describe(
            'The URL for the sectionGroups navigation property, which returns all the section groups in the section group. Read-only.'
          )
          .nullable(),
        sectionsUrl: z
          .string()
          .describe(
            'The URL for the sections navigation property, which returns all the sections in the section group. Read-only.'
          )
          .nullable(),
        parentNotebook: z
          .union([microsoft_graph_notebook, z.object({}).partial().strict()])
          .describe('The notebook that contains the section group. Read-only.'),
        parentSectionGroup: z
          .union([microsoft_graph_sectionGroup, z.object({}).partial().strict()])
          .describe('The section group that contains the section group. Read-only.'),
        sectionGroups: z
          .array(microsoft_graph_sectionGroup)
          .describe('The section groups in the section. Read-only. Nullable.'),
        sections: z
          .array(microsoft_graph_onenoteSection)
          .describe('The sections in the section group. Read-only. Nullable.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_notebook: z.ZodType<microsoft_graph_notebook> = z.lazy(() =>
  microsoft_graph_onenoteEntityHierarchyModel.and(
    z
      .object({
        isDefault: z
          .boolean()
          .describe("Indicates whether this is the user's default notebook. Read-only.")
          .nullable(),
        isShared: z
          .boolean()
          .describe(
            'Indicates whether the notebook is shared. If true, the contents of the notebook can be seen by people other than the owner. Read-only.'
          )
          .nullable(),
        links: z
          .union([microsoft_graph_notebookLinks, z.object({}).partial().strict()])
          .describe(
            "Links for opening the notebook. The oneNoteClientURL link opens the notebook in the OneNote native client if it's installed. The oneNoteWebURL link opens the notebook in OneNote on the web."
          ),
        sectionGroupsUrl: z
          .string()
          .describe(
            'The URL for the sectionGroups navigation property, which returns all the section groups in the notebook. Read-only.'
          )
          .nullable(),
        sectionsUrl: z
          .string()
          .describe(
            'The URL for the sections navigation property, which returns all the sections in the notebook. Read-only.'
          )
          .nullable(),
        userRole: z
          .union([microsoft_graph_onenoteUserRole, z.object({}).partial().strict()])
          .describe(
            'Possible values are: Owner, Contributor, Reader, None. Owner represents owner-level access to the notebook. Contributor represents read/write access to the notebook. Reader represents read-only access to the notebook. Read-only.'
          ),
        sectionGroups: z
          .array(microsoft_graph_sectionGroup)
          .describe('The section groups in the notebook. Read-only. Nullable.'),
        sections: z
          .array(microsoft_graph_onenoteSection)
          .describe('The sections in the notebook. Read-only. Nullable.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_operationStatus = z.enum(['NotStarted', 'Running', 'Completed', 'Failed']);
const microsoft_graph_operation = microsoft_graph_entity.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The start time of the operation.')
        .nullable(),
      lastActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The time of the last action of the operation.')
        .nullable(),
      status: z
        .union([microsoft_graph_operationStatus, z.object({}).partial().strict()])
        .describe('The current status of the operation: notStarted, running, completed, failed'),
    })
    .partial()
    .strict()
);
const microsoft_graph_onenoteOperationError = z
  .object({
    code: z.string().describe('The error code.').nullable(),
    message: z.string().describe('The error message.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_onenoteOperation = microsoft_graph_operation.and(
  z
    .object({
      error: z
        .union([microsoft_graph_onenoteOperationError, z.object({}).partial().strict()])
        .describe('The error returned by the operation.'),
      percentComplete: z
        .string()
        .describe('The operation percent complete if the operation is still in running status.')
        .nullable(),
      resourceId: z.string().describe('The resource id.').nullable(),
      resourceLocation: z
        .string()
        .describe(
          'The resource URI for the object. For example, the resource URI for a copied page or section.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_onenoteResource = microsoft_graph_onenoteEntityBaseModel.and(
  z
    .object({
      content: z.string().describe('The content stream').nullable(),
      contentUrl: z.string().describe('The URL for downloading the content').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_onenote = microsoft_graph_entity.and(
  z
    .object({
      notebooks: z
        .array(microsoft_graph_notebook)
        .describe(
          'The collection of OneNote notebooks that are owned by the user or group. Read-only. Nullable.'
        ),
      operations: z
        .array(microsoft_graph_onenoteOperation)
        .describe(
          "The status of OneNote operations. Getting an operations collection isn't supported, but you can get the status of long-running operations if the Operation-Location header is returned in the response. Read-only. Nullable."
        ),
      pages: z
        .array(microsoft_graph_onenotePage)
        .describe(
          'The pages in all OneNote notebooks that are owned by the user or group.  Read-only. Nullable.'
        ),
      resources: z
        .array(microsoft_graph_onenoteResource)
        .describe(
          "The image and other file resources in OneNote pages. Getting a resources collection isn't supported, but you can get the binary content of a specific resource. Read-only. Nullable."
        ),
      sectionGroups: z
        .array(microsoft_graph_sectionGroup)
        .describe(
          'The section groups in all OneNote notebooks that are owned by the user or group.  Read-only. Nullable.'
        ),
      sections: z
        .array(microsoft_graph_onenoteSection)
        .describe(
          'The sections in all OneNote notebooks that are owned by the user or group.  Read-only. Nullable.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_resourceSpecificPermissionGrant = microsoft_graph_directoryObject.and(
  z
    .object({
      clientAppId: z
        .string()
        .describe(
          'ID of the service principal of the Microsoft Entra app that has been granted access. Read-only.'
        )
        .nullable(),
      clientId: z
        .string()
        .describe('ID of the Microsoft Entra app that has been granted access. Read-only.')
        .nullable(),
      permission: z
        .string()
        .describe('The name of the resource-specific permission. Read-only.')
        .nullable(),
      permissionType: z
        .string()
        .describe('The type of permission. Possible values are: Application, Delegated. Read-only.')
        .nullable(),
      resourceAppId: z
        .string()
        .describe('ID of the Microsoft Entra app that is hosting the resource. Read-only.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_profilePhoto = microsoft_graph_entity.and(
  z
    .object({
      height: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The height of the photo. Read-only.')
        .nullable(),
      width: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The width of the photo. Read-only.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerContainerType = z.enum(['group', 'unknownFutureValue', 'roster']);
const microsoft_graph_plannerPlanContainer = z
  .object({
    containerId: z
      .string()
      .describe('The identifier of the resource that contains the plan. Optional.')
      .nullable(),
    type: z
      .union([microsoft_graph_plannerContainerType, z.object({}).partial().strict()])
      .describe(
        'The type of the resource that contains the plan. For supported types, see the previous table. Possible values are: group, unknownFutureValue, roster. Use the Prefer: include-unknown-enum-members request header to get the following value in this evolvable enum: roster. Optional.'
      ),
    url: z.string().describe('The full canonical URL of the container. Optional.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_plannerAppliedCategories = z.object({}).partial().strict();
const microsoft_graph_plannerAssignments = z.object({}).partial().strict();
const microsoft_graph_plannerPreviewType = z.enum([
  'automatic',
  'noPreview',
  'checklist',
  'description',
  'reference',
]);
const microsoft_graph_plannerOrderHintsByAssignee = z.object({}).partial().strict();
const microsoft_graph_plannerAssignedToTaskBoardTaskFormat = microsoft_graph_entity.and(
  z
    .object({
      orderHintsByAssignee: z
        .union([microsoft_graph_plannerOrderHintsByAssignee, z.object({}).partial().strict()])
        .describe(
          'Dictionary of hints used to order tasks on the AssignedTo view of the Task Board. The key of each entry is one of the users the task is assigned to and the value is the order hint. The format of each value is defined as outlined here.'
        ),
      unassignedOrderHint: z
        .string()
        .describe(
          "Hint value used to order the task on the AssignedTo view of the Task Board when the task isn't assigned to anyone, or if the orderHintsByAssignee dictionary doesn't provide an order hint for the user the task is assigned to. The format is defined as outlined here."
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerBucketTaskBoardTaskFormat = microsoft_graph_entity.and(
  z
    .object({
      orderHint: z
        .string()
        .describe(
          'Hint used to order tasks in the bucket view of the task board. For details about the supported format, see Using order hints in Planner.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerChecklistItems = z.object({}).partial().strict();
const microsoft_graph_plannerExternalReferences = z.object({}).partial().strict();
const microsoft_graph_plannerTaskDetails = microsoft_graph_entity.and(
  z
    .object({
      checklist: z
        .union([microsoft_graph_plannerChecklistItems, z.object({}).partial().strict()])
        .describe('The collection of checklist items on the task.'),
      description: z.string().describe('Description of the task.').nullable(),
      previewType: z
        .union([microsoft_graph_plannerPreviewType, z.object({}).partial().strict()])
        .describe(
          'This sets the type of preview that shows up on the task. The possible values are: automatic, noPreview, checklist, description, reference. When set to automatic the displayed preview is chosen by the app viewing the task.'
        ),
      references: z
        .union([microsoft_graph_plannerExternalReferences, z.object({}).partial().strict()])
        .describe('The collection of references on the task.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerProgressTaskBoardTaskFormat = microsoft_graph_entity.and(
  z
    .object({
      orderHint: z
        .string()
        .describe(
          'Hint value used to order the task on the progress view of the task board. For details about the supported format, see Using order hints in Planner.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerTask = microsoft_graph_entity.and(
  z
    .object({
      activeChecklistItemCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'Number of checklist items with value set to false, representing incomplete items.'
        )
        .nullable(),
      appliedCategories: z
        .union([microsoft_graph_plannerAppliedCategories, z.object({}).partial().strict()])
        .describe(
          'The categories to which the task has been applied. See applied Categories for possible values.'
        ),
      assigneePriority: z
        .string()
        .describe(
          'Hint used to order items of this type in a list view. The format is defined as outlined here.'
        )
        .nullable(),
      assignments: z
        .union([microsoft_graph_plannerAssignments, z.object({}).partial().strict()])
        .describe('The set of assignees the task is assigned to.'),
      bucketId: z
        .string()
        .describe(
          "Bucket ID to which the task belongs. The bucket needs to be in the plan that the task is in. It's 28 characters long and case-sensitive. Format validation is done on the service."
        )
        .nullable(),
      checklistItemCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Number of checklist items that are present on the task.')
        .nullable(),
      completedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('Identity of the user that completed the task.'),
      completedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "Read-only. Date and time at which the 'percentComplete' of the task is set to '100'. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
        )
        .nullable(),
      conversationThreadId: z
        .string()
        .describe(
          'Thread ID of the conversation on the task. This is the ID of the conversation thread object created in the group.'
        )
        .nullable(),
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('Identity of the user that created the task.'),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Read-only. Date and time at which the task is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      dueDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      hasDescription: z
        .boolean()
        .describe(
          'Read-only. Value is true if the details object of the task has a nonempty description and false otherwise.'
        )
        .nullable(),
      orderHint: z
        .string()
        .describe(
          'Hint used to order items of this type in a list view. The format is defined as outlined here.'
        )
        .nullable(),
      percentComplete: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'Percentage of task completion. When set to 100, the task is considered completed.'
        )
        .nullable(),
      planId: z.string().describe('Plan ID to which the task belongs.').nullable(),
      previewType: z
        .union([microsoft_graph_plannerPreviewType, z.object({}).partial().strict()])
        .describe(
          'This sets the type of preview that shows up on the task. The possible values are: automatic, noPreview, checklist, description, reference.'
        ),
      priority: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          "Priority of the task. The valid range of values is between 0 and 10, with the increasing value being lower priority (0 has the highest priority and 10 has the lowest priority).  Currently, Planner interprets values 0 and 1 as 'urgent', 2, 3 and 4 as 'important', 5, 6, and 7 as 'medium', and 8, 9, and 10 as 'low'.  Additionally, Planner sets the value 1 for 'urgent', 3 for 'important', 5 for 'medium', and 9 for 'low'."
        )
        .nullable(),
      referenceCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Number of external references that exist on the task.')
        .nullable(),
      startDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time at which the task starts. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      title: z.string().describe('Title of the task.'),
      assignedToTaskBoardFormat: z
        .union([
          microsoft_graph_plannerAssignedToTaskBoardTaskFormat,
          z.object({}).partial().strict(),
        ])
        .describe(
          'Read-only. Nullable. Used to render the task correctly in the task board view when grouped by assignedTo.'
        ),
      bucketTaskBoardFormat: z
        .union([microsoft_graph_plannerBucketTaskBoardTaskFormat, z.object({}).partial().strict()])
        .describe(
          'Read-only. Nullable. Used to render the task correctly in the task board view when grouped by bucket.'
        ),
      details: z
        .union([microsoft_graph_plannerTaskDetails, z.object({}).partial().strict()])
        .describe('Read-only. Nullable. More details about the task.'),
      progressTaskBoardFormat: z
        .union([
          microsoft_graph_plannerProgressTaskBoardTaskFormat,
          z.object({}).partial().strict(),
        ])
        .describe(
          'Read-only. Nullable. Used to render the task correctly in the task board view when grouped by progress.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerBucket = microsoft_graph_entity.and(
  z
    .object({
      name: z.string().describe('Name of the bucket.'),
      orderHint: z
        .string()
        .describe(
          'Hint used to order items of this type in a list view. For details about the supported format, see Using order hints in Planner.'
        )
        .nullable(),
      planId: z.string().describe('Plan ID to which the bucket belongs.').nullable(),
      tasks: z
        .array(microsoft_graph_plannerTask)
        .describe('Read-only. Nullable. The collection of tasks in the bucket.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerCategoryDescriptions = z
  .object({
    category1: z.string().describe('The label associated with Category 1').nullable(),
    category10: z.string().describe('The label associated with Category 10').nullable(),
    category11: z.string().describe('The label associated with Category 11').nullable(),
    category12: z.string().describe('The label associated with Category 12').nullable(),
    category13: z.string().describe('The label associated with Category 13').nullable(),
    category14: z.string().describe('The label associated with Category 14').nullable(),
    category15: z.string().describe('The label associated with Category 15').nullable(),
    category16: z.string().describe('The label associated with Category 16').nullable(),
    category17: z.string().describe('The label associated with Category 17').nullable(),
    category18: z.string().describe('The label associated with Category 18').nullable(),
    category19: z.string().describe('The label associated with Category 19').nullable(),
    category2: z.string().describe('The label associated with Category 2').nullable(),
    category20: z.string().describe('The label associated with Category 20').nullable(),
    category21: z.string().describe('The label associated with Category 21').nullable(),
    category22: z.string().describe('The label associated with Category 22').nullable(),
    category23: z.string().describe('The label associated with Category 23').nullable(),
    category24: z.string().describe('The label associated with Category 24').nullable(),
    category25: z.string().describe('The label associated with Category 25').nullable(),
    category3: z.string().describe('The label associated with Category 3').nullable(),
    category4: z.string().describe('The label associated with Category 4').nullable(),
    category5: z.string().describe('The label associated with Category 5').nullable(),
    category6: z.string().describe('The label associated with Category 6').nullable(),
    category7: z.string().describe('The label associated with Category 7').nullable(),
    category8: z.string().describe('The label associated with Category 8').nullable(),
    category9: z.string().describe('The label associated with Category 9').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_plannerUserIds = z.object({}).partial().strict();
const microsoft_graph_plannerPlanDetails = microsoft_graph_entity.and(
  z
    .object({
      categoryDescriptions: z
        .union([microsoft_graph_plannerCategoryDescriptions, z.object({}).partial().strict()])
        .describe(
          'An object that specifies the descriptions of the 25 categories that can be associated with tasks in the plan.'
        ),
      sharedWith: z
        .union([microsoft_graph_plannerUserIds, z.object({}).partial().strict()])
        .describe(
          "Set of user IDs that this plan is shared with. If you're using Microsoft 365 groups, use the Groups API to manage group membership to share the group's plan. You can also add existing members of the group to this collection, although it isn't required for them to access the plan owned by the group."
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerPlan = microsoft_graph_entity.and(
  z
    .object({
      container: z
        .union([microsoft_graph_plannerPlanContainer, z.object({}).partial().strict()])
        .describe(
          "Identifies the container of the plan. Specify only the url, the containerId and type, or all properties. After it's set, this property can’t be updated. Required."
        ),
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('Read-only. The user who created the plan.'),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Read-only. Date and time at which the plan is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      owner: z
        .string()
        .describe(
          "Use the container property instead. ID of the group that owns the plan. After it's set, this property can’t be updated. This property won't return a valid group ID if the container of the plan isn't a group."
        )
        .nullable(),
      title: z.string().describe('Required. Title of the plan.'),
      buckets: z
        .array(microsoft_graph_plannerBucket)
        .describe('Read-only. Nullable. Collection of buckets in the plan.'),
      details: z
        .union([microsoft_graph_plannerPlanDetails, z.object({}).partial().strict()])
        .describe('Read-only. Nullable. Extra details about the plan.'),
      tasks: z
        .array(microsoft_graph_plannerTask)
        .describe('Read-only. Nullable. Collection of tasks in the plan.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerGroup = microsoft_graph_entity.and(
  z
    .object({
      plans: z
        .array(microsoft_graph_plannerPlan)
        .describe('Read-only. Nullable. Returns the plannerPlans owned by the group.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_settingValue = z
  .object({
    name: z
      .string()
      .describe('Name of the setting (as defined by the groupSettingTemplate).')
      .nullable(),
    value: z.string().describe('Value of the setting.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_groupSetting = microsoft_graph_entity.and(
  z
    .object({
      displayName: z
        .string()
        .describe(
          'Display name of this group of settings, which comes from the associated template.'
        )
        .nullable(),
      templateId: z
        .string()
        .describe(
          "Unique identifier for the tenant-level groupSettingTemplates object that's been customized for this group-level settings object. Read-only."
        )
        .nullable(),
      values: z
        .array(microsoft_graph_settingValue)
        .describe(
          'Collection of name-value pairs corresponding to the name and defaultValue properties in the referenced groupSettingTemplates object.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_root = z.object({}).partial().strict();
const microsoft_graph_siteArchiveStatus = z.enum([
  'recentlyArchived',
  'fullyArchived',
  'reactivating',
  'unknownFutureValue',
]);
const microsoft_graph_siteArchivalDetails = z
  .object({
    archiveStatus: z
      .union([microsoft_graph_siteArchiveStatus, z.object({}).partial().strict()])
      .describe(
        'Represents the current archive status of the site collection. Returned only on $select. The possible values are: recentlyArchived, fullyArchived, reactivating, unknownFutureValue.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_siteCollection = z
  .object({
    archivalDetails: z
      .union([microsoft_graph_siteArchivalDetails, z.object({}).partial().strict()])
      .describe(
        'Represents whether the site collection is recently archived, fully archived, or reactivating. Possible values are: recentlyArchived, fullyArchived, reactivating, unknownFutureValue.'
      ),
    dataLocationCode: z
      .string()
      .describe(
        'The geographic region code for where this site collection resides. Only present for multi-geo tenants. Read-only.'
      )
      .nullable(),
    hostname: z.string().describe('The hostname for the site collection. Read-only.').nullable(),
    root: z
      .union([microsoft_graph_root, z.object({}).partial().strict()])
      .describe(
        'If present, indicates that this is a root site collection in SharePoint. Read-only.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_pageLayoutType = z.enum([
  'microsoftReserved',
  'article',
  'home',
  'unknownFutureValue',
]);
const microsoft_graph_baseSitePage: z.ZodType<microsoft_graph_baseSitePage> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        pageLayout: z
          .union([microsoft_graph_pageLayoutType, z.object({}).partial().strict()])
          .describe(
            'The name of the page layout of the page. The possible values are: microsoftReserved, article, home, unknownFutureValue.'
          ),
        publishingState: z
          .union([microsoft_graph_publicationFacet, z.object({}).partial().strict()])
          .describe('The publishing status and the MM.mm version of the page.'),
        title: z.string().describe('Title of the sitePage.').nullable(),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_sharePointIdentity = microsoft_graph_identity.and(
  z
    .object({
      loginName: z.string().describe('The sign in name of the SharePoint identity.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_sharePointIdentitySet = microsoft_graph_identitySet.and(
  z
    .object({
      group: z
        .union([microsoft_graph_identity, z.object({}).partial().strict()])
        .describe('The group associated with this action. Optional.'),
      siteGroup: z
        .union([microsoft_graph_sharePointIdentity, z.object({}).partial().strict()])
        .describe('The SharePoint group associated with this action. Optional.'),
      siteUser: z
        .union([microsoft_graph_sharePointIdentity, z.object({}).partial().strict()])
        .describe('The SharePoint user associated with this action. Optional.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_sharingInvitation = z
  .object({
    email: z
      .string()
      .describe(
        'The email address provided for the recipient of the sharing invitation. Read-only.'
      )
      .nullable(),
    invitedBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
      .describe(
        'Provides information about who sent the invitation that created this permission, if that information is available. Read-only.'
      ),
    redeemedBy: z.string().nullable(),
    signInRequired: z
      .boolean()
      .describe(
        'If true the recipient of the invitation needs to sign in in order to access the shared item. Read-only.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_sharingLink = z
  .object({
    application: z
      .union([microsoft_graph_identity, z.object({}).partial().strict()])
      .describe('The app the link is associated with.'),
    preventsDownload: z
      .boolean()
      .describe(
        'If true then the user can only use this link to view the item on the web, and cannot use it to download the contents of the item. Only for OneDrive for Business and SharePoint.'
      )
      .nullable(),
    scope: z
      .string()
      .describe(
        'The scope of the link represented by this permission. Value anonymous indicates the link is usable by anyone, organization indicates the link is only usable for users signed into the same tenant.'
      )
      .nullable(),
    type: z.string().describe('The type of the link created.').nullable(),
    webHtml: z
      .string()
      .describe(
        'For embed links, this property contains the HTML code for an <iframe> element that will embed the item in a webpage.'
      )
      .nullable(),
    webUrl: z
      .string()
      .describe('A URL that opens the item in the browser on the OneDrive website.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_permission = microsoft_graph_entity.and(
  z
    .object({
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "A format of yyyy-MM-ddTHH:mm:ssZ of DateTimeOffset indicates the expiration time of the permission. DateTime.MinValue indicates there's no expiration set for this permission. Optional."
        )
        .nullable(),
      grantedTo: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe(
          'For user type permissions, the details of the users and applications for this permission. Read-only.'
        ),
      grantedToIdentities: z
        .array(microsoft_graph_identitySet)
        .describe(
          'For type permissions, the details of the users to whom permission was granted. Read-only.'
        ),
      grantedToIdentitiesV2: z
        .array(microsoft_graph_sharePointIdentitySet)
        .describe(
          'For link type permissions, the details of the users to whom permission was granted. Read-only.'
        ),
      grantedToV2: z
        .union([microsoft_graph_sharePointIdentitySet, z.object({}).partial().strict()])
        .describe(
          'For user type permissions, the details of the users and applications for this permission. Read-only.'
        ),
      hasPassword: z
        .boolean()
        .describe(
          'Indicates whether the password is set for this permission. This property only appears in the response. Optional. Read-only. For OneDrive Personal only..'
        )
        .nullable(),
      inheritedFrom: z
        .union([microsoft_graph_itemReference, z.object({}).partial().strict()])
        .describe(
          "Provides a reference to the ancestor of the current permission, if it's inherited from an ancestor. Read-only."
        ),
      invitation: z
        .union([microsoft_graph_sharingInvitation, z.object({}).partial().strict()])
        .describe('Details of any associated sharing invitation for this permission. Read-only.'),
      link: z
        .union([microsoft_graph_sharingLink, z.object({}).partial().strict()])
        .describe(
          "Provides the link details of the current permission, if it's a link type permission. Read-only."
        ),
      roles: z
        .array(z.string().nullable())
        .describe(
          'The type of permission, for example, read. See below for the full list of roles. Read-only.'
        ),
      shareId: z
        .string()
        .describe(
          'A unique token that can be used to access this shared item via the shares API. Read-only.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_termStore_store = microsoft_graph_entity.and(
  z
    .object({
      defaultLanguageTag: z.string().describe('Default language of the term store.'),
      languageTags: z.array(z.string()).describe('List of languages for the term store.'),
      groups: z
        .array(microsoft_graph_termStore_group)
        .describe('Collection of all groups available in the term store.'),
      sets: z
        .array(microsoft_graph_termStore_set)
        .describe(
          'Collection of all sets available in the term store. This relationship can only be used to load a specific term set.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_site: z.ZodType<microsoft_graph_site> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        displayName: z.string().describe('The full title for the site. Read-only.').nullable(),
        error: z.union([microsoft_graph_publicError, z.object({}).partial().strict()]),
        isPersonalSite: z
          .boolean()
          .describe('Identifies whether the site is personal or not. Read-only.')
          .nullable(),
        root: z
          .union([microsoft_graph_root, z.object({}).partial().strict()])
          .describe('If present, provides the root site in the site collection. Read-only.'),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().strict()])
          .describe('Returns identifiers useful for SharePoint REST compatibility. Read-only.'),
        siteCollection: z
          .union([microsoft_graph_siteCollection, z.object({}).partial().strict()])
          .describe(
            "Provides details about the site's site collection. Available only on the root site. Read-only."
          ),
        analytics: z
          .union([microsoft_graph_itemAnalytics, z.object({}).partial().strict()])
          .describe('Analytics about the view activities that took place on this site.'),
        columns: z
          .array(microsoft_graph_columnDefinition)
          .describe('The collection of column definitions reusable across lists under this site.'),
        contentTypes: z
          .array(microsoft_graph_contentType)
          .describe('The collection of content types defined for this site.'),
        drive: z
          .union([microsoft_graph_drive, z.object({}).partial().strict()])
          .describe('The default drive (document library) for this site.'),
        drives: z
          .array(microsoft_graph_drive)
          .describe('The collection of drives (document libraries) under this site.'),
        externalColumns: z.array(microsoft_graph_columnDefinition),
        items: z
          .array(microsoft_graph_baseItem)
          .describe(
            "Used to address any item contained in this site. This collection can't be enumerated."
          ),
        lists: z.array(microsoft_graph_list).describe('The collection of lists under this site.'),
        onenote: z
          .union([microsoft_graph_onenote, z.object({}).partial().strict()])
          .describe('Calls the OneNote service for notebook related operations.'),
        operations: z
          .array(microsoft_graph_richLongRunningOperation)
          .describe('The collection of long-running operations on the site.'),
        pages: z
          .array(microsoft_graph_baseSitePage)
          .describe('The collection of pages in the baseSitePages list in this site.'),
        permissions: z
          .array(microsoft_graph_permission)
          .describe('The permissions associated with the site. Nullable.'),
        sites: z
          .array(microsoft_graph_site)
          .describe('The collection of the sub-sites under this site.'),
        termStore: z
          .union([microsoft_graph_termStore_store, z.object({}).partial().strict()])
          .describe('The default termStore under this site.'),
        termStores: z
          .array(microsoft_graph_termStore_store)
          .describe('The collection of termStores under this site.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_giphyRatingType = z.enum(['strict', 'moderate', 'unknownFutureValue']);
const microsoft_graph_teamFunSettings = z
  .object({
    allowCustomMemes: z
      .boolean()
      .describe('If set to true, enables users to include custom memes.')
      .nullable(),
    allowGiphy: z.boolean().describe('If set to true, enables Giphy use.').nullable(),
    allowStickersAndMemes: z
      .boolean()
      .describe('If set to true, enables users to include stickers and memes.')
      .nullable(),
    giphyContentRating: z
      .union([microsoft_graph_giphyRatingType, z.object({}).partial().strict()])
      .describe('Giphy content rating. Possible values are: moderate, strict.'),
  })
  .partial()
  .strict();
const microsoft_graph_teamGuestSettings = z
  .object({
    allowCreateUpdateChannels: z
      .boolean()
      .describe('If set to true, guests can add and update channels.')
      .nullable(),
    allowDeleteChannels: z
      .boolean()
      .describe('If set to true, guests can delete channels.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_teamMemberSettings = z
  .object({
    allowAddRemoveApps: z
      .boolean()
      .describe('If set to true, members can add and remove apps.')
      .nullable(),
    allowCreatePrivateChannels: z
      .boolean()
      .describe('If set to true, members can add and update private channels.')
      .nullable(),
    allowCreateUpdateChannels: z
      .boolean()
      .describe('If set to true, members can add and update channels.')
      .nullable(),
    allowCreateUpdateRemoveConnectors: z
      .boolean()
      .describe('If set to true, members can add, update, and remove connectors.')
      .nullable(),
    allowCreateUpdateRemoveTabs: z
      .boolean()
      .describe('If set to true, members can add, update, and remove tabs.')
      .nullable(),
    allowDeleteChannels: z
      .boolean()
      .describe('If set to true, members can delete channels.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_teamMessagingSettings = z
  .object({
    allowChannelMentions: z
      .boolean()
      .describe('If set to true, @channel mentions are allowed.')
      .nullable(),
    allowOwnerDeleteMessages: z
      .boolean()
      .describe('If set to true, owners can delete any message.')
      .nullable(),
    allowTeamMentions: z
      .boolean()
      .describe('If set to true, @team mentions are allowed.')
      .nullable(),
    allowUserDeleteMessages: z
      .boolean()
      .describe('If set to true, users can delete their messages.')
      .nullable(),
    allowUserEditMessages: z
      .boolean()
      .describe('If set to true, users can edit their messages.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_teamSpecialization = z.enum([
  'none',
  'educationStandard',
  'educationClass',
  'educationProfessionalLearningCommunity',
  'educationStaff',
  'healthcareStandard',
  'healthcareCareCoordination',
  'unknownFutureValue',
]);
const microsoft_graph_teamSummary = z
  .object({
    guestsCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of guests in a team.')
      .nullable(),
    membersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of members in a team.')
      .nullable(),
    ownersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of owners in a team.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_teamVisibilityType = z.enum([
  'private',
  'public',
  'hiddenMembership',
  'unknownFutureValue',
]);
const microsoft_graph_channelMembershipType = z.enum([
  'standard',
  'private',
  'unknownFutureValue',
  'shared',
]);
const microsoft_graph_channelSummary = z
  .object({
    guestsCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of guests in a channel.')
      .nullable(),
    hasMembersFromOtherTenants: z
      .boolean()
      .describe('Indicates whether external members are included on the channel.')
      .nullable(),
    membersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of members in a channel.')
      .nullable(),
    ownersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of owners in a channel.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_conversationMember = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().describe('The display name of the user.').nullable(),
      roles: z
        .array(z.string().nullable())
        .describe(
          "The roles for that user. This property contains more qualifiers only when relevant - for example, if the member has owner privileges, the roles property contains owner as one of the values. Similarly, if the member is an in-tenant guest, the roles property contains guest as one of the values. A basic member shouldn't have any values specified in the roles property. An Out-of-tenant external member is assigned the owner role."
        ),
      visibleHistoryStartDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "The timestamp denoting how far back a conversation's history is shared with the conversation member. This property is settable only for members of a chat."
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_chatMessageAttachment = z
  .object({
    content: z
      .string()
      .describe(
        'The content of the attachment. If the attachment is a rich card, set the property to the rich card object. This property and contentUrl are mutually exclusive.'
      )
      .nullable(),
    contentType: z
      .string()
      .describe(
        "The media type of the content attachment. The possible values are: reference: The attachment is a link to another file. Populate the contentURL with the link to the object.forwardedMessageReference: The attachment is a reference to a forwarded message. Populate the content with the original message context.Any contentType that is supported by the Bot Framework's Attachment object.application/vnd.microsoft.card.codesnippet: A code snippet. application/vnd.microsoft.card.announcement: An announcement header."
      )
      .nullable(),
    contentUrl: z.string().describe('The URL for the content of the attachment.').nullable(),
    id: z.string().describe('Read-only. The unique ID of the attachment.').nullable(),
    name: z.string().describe('The name of the attachment.').nullable(),
    teamsAppId: z
      .string()
      .describe(
        'The ID of the Teams app that is associated with the attachment. The property is used to attribute a Teams message card to the specified app.'
      )
      .nullable(),
    thumbnailUrl: z
      .string()
      .describe(
        'The URL to a thumbnail image that the channel can use if it supports using an alternative, smaller form of content or contentUrl. For example, if you set contentType to application/word and set contentUrl to the location of the Word document, you might include a thumbnail image that represents the document. The channel could display the thumbnail image instead of the document. When the user selects the image, the channel would open the document.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_channelIdentity = z
  .object({
    channelId: z
      .string()
      .describe('The identity of the channel in which the message was posted.')
      .nullable(),
    teamId: z
      .string()
      .describe('The identity of the team in which the message was posted.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_eventMessageDetail = z.object({}).partial().strict();
const microsoft_graph_chatMessageFromIdentitySet = microsoft_graph_identitySet.and(
  z.object({}).partial().strict()
);
const microsoft_graph_chatMessageImportance = z.enum([
  'normal',
  'high',
  'urgent',
  'unknownFutureValue',
]);
const microsoft_graph_teamworkConversationIdentityType = z.enum([
  'team',
  'channel',
  'chat',
  'unknownFutureValue',
]);
const microsoft_graph_teamworkConversationIdentity = microsoft_graph_identity.and(
  z
    .object({
      conversationIdentityType: z
        .union([microsoft_graph_teamworkConversationIdentityType, z.object({}).partial().strict()])
        .describe(
          'Type of conversation. Possible values are: team, channel, chat, and unknownFutureValue.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_chatMessageMentionedIdentitySet = microsoft_graph_identitySet.and(
  z
    .object({
      conversation: z
        .union([microsoft_graph_teamworkConversationIdentity, z.object({}).partial().strict()])
        .describe(
          'If present, represents a conversation (for example, team, channel, or chat) @mentioned in a message.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_chatMessageMention = z
  .object({
    id: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        "Index of an entity being mentioned in the specified chatMessage. Matches the {index} value in the corresponding <at id='{index}'> tag in the message body."
      )
      .nullable(),
    mentioned: z
      .union([microsoft_graph_chatMessageMentionedIdentitySet, z.object({}).partial().strict()])
      .describe('The entity (user, application, team, channel, or chat) that was @mentioned.'),
    mentionText: z
      .string()
      .describe(
        "String used to represent the mention. For example, a user's display name, a team name."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_chatMessageActions = z.enum([
  'reactionAdded',
  'reactionRemoved',
  'actionUndefined',
  'unknownFutureValue',
]);
const microsoft_graph_chatMessageReactionIdentitySet = microsoft_graph_identitySet.and(
  z.object({}).partial().strict()
);
const microsoft_graph_chatMessageReaction = z
  .object({
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      ),
    displayName: z.string().describe('The name of the reaction.').nullable(),
    reactionContentUrl: z
      .string()
      .describe('The hosted content URL for the custom reaction type.')
      .nullable(),
    reactionType: z
      .string()
      .describe(
        'The reaction type. Supported values include Unicode characters, custom, and some backward-compatible reaction types, such as like, angry, sad, laugh, heart, and surprised.'
      ),
    user: microsoft_graph_chatMessageReactionIdentitySet,
  })
  .partial()
  .strict();
const microsoft_graph_chatMessageHistoryItem = z
  .object({
    actions: microsoft_graph_chatMessageActions,
    modifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The date and time when the message was modified.'),
    reaction: z
      .union([microsoft_graph_chatMessageReaction, z.object({}).partial().strict()])
      .describe('The reaction in the modified message.'),
  })
  .partial()
  .strict();
const microsoft_graph_chatMessageType = z.enum([
  'message',
  'chatEvent',
  'typing',
  'unknownFutureValue',
  'systemEventMessage',
]);
const microsoft_graph_chatMessagePolicyViolationDlpActionTypes = z.enum([
  'none',
  'notifySender',
  'blockAccess',
  'blockAccessExternal',
]);
const microsoft_graph_chatMessagePolicyViolationPolicyTip = z
  .object({
    complianceUrl: z
      .string()
      .describe(
        "The URL a user can visit to read about the data loss prevention policies for the organization. (ie, policies about what users shouldn't say in chats)"
      )
      .nullable(),
    generalText: z
      .string()
      .describe('Explanatory text shown to the sender of the message.')
      .nullable(),
    matchedConditionDescriptions: z
      .array(z.string().nullable())
      .describe(
        "The list of improper data in the message that was detected by the data loss prevention app. Each DLP app defines its own conditions, examples include 'Credit Card Number' and 'Social Security Number'."
      ),
  })
  .partial()
  .strict();
const microsoft_graph_chatMessagePolicyViolationUserActionTypes = z.enum([
  'none',
  'override',
  'reportFalsePositive',
]);
const microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes = z.enum([
  'none',
  'allowFalsePositiveOverride',
  'allowOverrideWithoutJustification',
  'allowOverrideWithJustification',
]);
const microsoft_graph_chatMessagePolicyViolation = z
  .object({
    dlpAction: z
      .union([
        microsoft_graph_chatMessagePolicyViolationDlpActionTypes,
        z.object({}).partial().strict(),
      ])
      .describe(
        'The action taken by the DLP provider on the message with sensitive content. Supported values are: NoneNotifySender -- Inform the sender of the violation but allow readers to read the message.BlockAccess -- Block readers from reading the message.BlockAccessExternal -- Block users outside the organization from reading the message, while allowing users within the organization to read the message.'
      ),
    justificationText: z
      .string()
      .describe(
        'Justification text provided by the sender of the message when overriding a policy violation.'
      )
      .nullable(),
    policyTip: z
      .union([microsoft_graph_chatMessagePolicyViolationPolicyTip, z.object({}).partial().strict()])
      .describe(
        'Information to display to the message sender about why the message was flagged as a violation.'
      ),
    userAction: z
      .union([
        microsoft_graph_chatMessagePolicyViolationUserActionTypes,
        z.object({}).partial().strict(),
      ])
      .describe(
        "Indicates the action taken by the user on a message blocked by the DLP provider. Supported values are: NoneOverrideReportFalsePositiveWhen the DLP provider is updating the message for blocking sensitive content, userAction isn't required."
      ),
    verdictDetails: z
      .union([
        microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes,
        z.object({}).partial().strict(),
      ])
      .describe(
        'Indicates what actions the sender may take in response to the policy violation. Supported values are: NoneAllowFalsePositiveOverride -- Allows the sender to declare the policyViolation to be an error in the DLP app and its rules, and allow readers to see the message again if the dlpAction hides it.AllowOverrideWithoutJustification -- Allows the sender to override the DLP violation and allow readers to see the message again if the dlpAction hides it, without needing to provide an explanation for doing so. AllowOverrideWithJustification -- Allows the sender to override the DLP violation and allow readers to see the message again if the dlpAction hides it, after providing an explanation for doing so.AllowOverrideWithoutJustification and AllowOverrideWithJustification are mutually exclusive.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_teamworkHostedContent = microsoft_graph_entity.and(
  z
    .object({
      contentBytes: z
        .string()
        .describe('Write only. Bytes for the hosted content (such as images).')
        .nullable(),
      contentType: z
        .string()
        .describe('Write only. Content type. such as image/png, image/jpg.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_chatMessageHostedContent = microsoft_graph_teamworkHostedContent.and(
  z.object({}).partial().strict()
);
const microsoft_graph_chatMessage: z.ZodType<microsoft_graph_chatMessage> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        attachments: z
          .array(microsoft_graph_chatMessageAttachment)
          .describe('References to attached objects like files, tabs, meetings etc.'),
        body: microsoft_graph_itemBody,
        channelIdentity: z
          .union([microsoft_graph_channelIdentity, z.object({}).partial().strict()])
          .describe('If the message was sent in a channel, represents identity of the channel.'),
        chatId: z
          .string()
          .describe('If the message was sent in a chat, represents the identity of the chat.')
          .nullable(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Timestamp of when the chat message was created.')
          .nullable(),
        deletedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Read only. Timestamp at which the chat message was deleted, or null if not deleted.'
          )
          .nullable(),
        etag: z.string().describe('Read-only. Version number of the chat message.').nullable(),
        eventDetail: z
          .union([microsoft_graph_eventMessageDetail, z.object({}).partial().strict()])
          .describe(
            'Read-only. If present, represents details of an event that happened in a chat, a channel, or a team, for example, adding new members. For event messages, the messageType property will be set to systemEventMessage.'
          ),
        from: z
          .union([microsoft_graph_chatMessageFromIdentitySet, z.object({}).partial().strict()])
          .describe('Details of the sender of the chat message. Can only be set during migration.'),
        importance: microsoft_graph_chatMessageImportance,
        lastEditedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "Read only. Timestamp when edits to the chat message were made. Triggers an 'Edited' flag in the Teams UI. If no edits are made the value is null."
          )
          .nullable(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Read only. Timestamp when the chat message is created (initial setting) or modified, including when a reaction is added or removed.'
          )
          .nullable(),
        locale: z
          .string()
          .describe('Locale of the chat message set by the client. Always set to en-us.'),
        mentions: z
          .array(microsoft_graph_chatMessageMention)
          .describe(
            'List of entities mentioned in the chat message. Supported entities are: user, bot, team, channel, chat, and tag.'
          ),
        messageHistory: z
          .array(microsoft_graph_chatMessageHistoryItem)
          .describe(
            'List of activity history of a message item, including modification time and actions, such as reactionAdded, reactionRemoved, or reaction changes, on the message.'
          ),
        messageType: microsoft_graph_chatMessageType,
        policyViolation: z
          .union([microsoft_graph_chatMessagePolicyViolation, z.object({}).partial().strict()])
          .describe(
            'Defines the properties of a policy violation set by a data loss prevention (DLP) application.'
          ),
        reactions: z
          .array(microsoft_graph_chatMessageReaction)
          .describe('Reactions for this chat message (for example, Like).'),
        replyToId: z
          .string()
          .describe(
            'Read-only. ID of the parent chat message or root chat message of the thread. (Only applies to chat messages in channels, not chats.)'
          )
          .nullable(),
        subject: z.string().describe('The subject of the chat message, in plaintext.').nullable(),
        summary: z
          .string()
          .describe(
            'Summary text of the chat message that could be used for push notifications and summary views or fall back views. Only applies to channel chat messages, not chat messages in a chat.'
          )
          .nullable(),
        webUrl: z
          .string()
          .describe('Read-only. Link to the message in Microsoft Teams.')
          .nullable(),
        hostedContents: z
          .array(microsoft_graph_chatMessageHostedContent)
          .describe(
            'Content in a message hosted by Microsoft Teams - for example, images or code snippets.'
          ),
        replies: z
          .array(microsoft_graph_chatMessage)
          .describe('Replies for a specified message. Supports $expand for channel messages.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_teamInfo: z.ZodType<microsoft_graph_teamInfo> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        displayName: z.string().describe('The name of the team.').nullable(),
        tenantId: z.string().describe('The ID of the Microsoft Entra tenant.').nullable(),
        team: z.union([microsoft_graph_team, z.object({}).partial().strict()]),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_sharedWithChannelTeamInfo: z.ZodType<microsoft_graph_sharedWithChannelTeamInfo> =
  z.lazy(() =>
    microsoft_graph_teamInfo.and(
      z
        .object({
          isHostTeam: z
            .boolean()
            .describe('Indicates whether the team is the host of the channel.')
            .nullable(),
          allowedMembers: z
            .array(microsoft_graph_conversationMember)
            .describe('A collection of team members who have access to the shared channel.'),
        })
        .partial()
        .strict()
    )
  );
const microsoft_graph_teamsTabConfiguration = z
  .object({
    contentUrl: z
      .string()
      .describe('Url used for rendering tab contents in Teams. Required.')
      .nullable(),
    entityId: z
      .string()
      .describe('Identifier for the entity hosted by the tab provider.')
      .nullable(),
    removeUrl: z
      .string()
      .describe('Url called by Teams client when a Tab is removed using the Teams Client.')
      .nullable(),
    websiteUrl: z.string().describe('Url for showing tab contents outside of Teams.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_teamsAppDistributionMethod = z.enum([
  'store',
  'organization',
  'sideloaded',
  'unknownFutureValue',
]);
const microsoft_graph_teamsAppResourceSpecificPermissionType = z.enum([
  'delegated',
  'application',
  'unknownFutureValue',
]);
const microsoft_graph_teamsAppResourceSpecificPermission = z
  .object({
    permissionType: z
      .union([
        microsoft_graph_teamsAppResourceSpecificPermissionType,
        z.object({}).partial().strict(),
      ])
      .describe('The type of resource-specific permission.'),
    permissionValue: z
      .string()
      .describe('The name of the resource-specific permission.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_teamsAppPermissionSet = z
  .object({
    resourceSpecificPermissions: z
      .array(microsoft_graph_teamsAppResourceSpecificPermission)
      .describe('A collection of resource-specific permissions.'),
  })
  .partial()
  .strict();
const microsoft_graph_teamsAppAuthorization = z
  .object({
    clientAppId: z
      .string()
      .describe('The registration ID of the Microsoft Entra app ID associated with the teamsApp.')
      .nullable(),
    requiredPermissionSet: z
      .union([microsoft_graph_teamsAppPermissionSet, z.object({}).partial().strict()])
      .describe('Set of permissions required by the teamsApp.'),
  })
  .partial()
  .strict();
const microsoft_graph_teamsAppPublishingState = z.enum([
  'submitted',
  'rejected',
  'published',
  'unknownFutureValue',
]);
const microsoft_graph_teamworkBot = microsoft_graph_entity.and(z.object({}).partial().strict());
const microsoft_graph_teamsAppDefinition = microsoft_graph_entity.and(
  z
    .object({
      authorization: z
        .union([microsoft_graph_teamsAppAuthorization, z.object({}).partial().strict()])
        .describe('Authorization requirements specified in the Teams app manifest.'),
      createdBy: z.union([microsoft_graph_identitySet, z.object({}).partial().strict()]),
      description: z.string().describe('Verbose description of the application.').nullable(),
      displayName: z
        .string()
        .describe('The name of the app provided by the app developer.')
        .nullable(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullable(),
      publishingState: z
        .union([microsoft_graph_teamsAppPublishingState, z.object({}).partial().strict()])
        .describe(
          'The published status of a specific version of a Teams app. Possible values are:submitted—The specific version of the Teams app was submitted and is under review.published—The request to publish the specific version of the Teams app was approved by the admin and the app is published.rejected—The admin rejected the request to publish the specific version of the Teams app.'
        ),
      shortDescription: z.string().describe('Short description of the application.').nullable(),
      teamsAppId: z.string().describe('The ID from the Teams app manifest.').nullable(),
      version: z.string().describe('The version number of the application.').nullable(),
      bot: z
        .union([microsoft_graph_teamworkBot, z.object({}).partial().strict()])
        .describe('The details of the bot specified in the Teams app manifest.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_teamsApp = microsoft_graph_entity.and(
  z
    .object({
      displayName: z
        .string()
        .describe(
          'The name of the catalog app provided by the app developer in the Microsoft Teams zip app package.'
        )
        .nullable(),
      distributionMethod: z
        .union([microsoft_graph_teamsAppDistributionMethod, z.object({}).partial().strict()])
        .describe('The method of distribution for the app. Read-only.'),
      externalId: z
        .string()
        .describe(
          'The ID of the catalog provided by the app developer in the Microsoft Teams zip app package.'
        )
        .nullable(),
      appDefinitions: z
        .array(microsoft_graph_teamsAppDefinition)
        .describe('The details for each version of the app.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_teamsTab = microsoft_graph_entity.and(
  z
    .object({
      configuration: z
        .union([microsoft_graph_teamsTabConfiguration, z.object({}).partial().strict()])
        .describe(
          'Container for custom settings applied to a tab. The tab is considered configured only once this property is set.'
        ),
      displayName: z.string().describe('Name of the tab.').nullable(),
      webUrl: z.string().describe('Deep link URL of the tab instance. Read only.').nullable(),
      teamsApp: z
        .union([microsoft_graph_teamsApp, z.object({}).partial().strict()])
        .describe(
          "The application that is linked to the tab. This can't be changed after tab creation."
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_channel: z.ZodType<microsoft_graph_channel> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Read only. Timestamp at which the channel was created.')
          .nullable(),
        description: z
          .string()
          .describe('Optional textual description for the channel.')
          .nullable(),
        displayName: z
          .string()
          .describe(
            'Channel name as it will appear to the user in Microsoft Teams. The maximum length is 50 characters.'
          ),
        email: z
          .string()
          .describe('The email address for sending messages to the channel. Read-only.')
          .nullable(),
        isArchived: z
          .boolean()
          .describe('Indicates whether the channel is archived. Read-only.')
          .nullable(),
        isFavoriteByDefault: z
          .boolean()
          .describe(
            'Indicates whether the channel should be marked as recommended for all members of the team to show in their channel list. Note: All recommended channels automatically show in the channels list for education and frontline worker users. The property can only be set programmatically via the Create team method. The default value is false.'
          )
          .nullable(),
        membershipType: z
          .union([microsoft_graph_channelMembershipType, z.object({}).partial().strict()])
          .describe(
            "The type of the channel. Can be set during creation and can't be changed. The possible values are: standard, private, unknownFutureValue, shared. The default value is standard. Use the Prefer: include-unknown-enum-members request header to get the following value in this evolvable enum: shared."
          ),
        summary: z
          .union([microsoft_graph_channelSummary, z.object({}).partial().strict()])
          .describe(
            'Contains summary information about the channel, including number of owners, members, guests, and an indicator for members from other tenants. The summary property will only be returned if it is specified in the $select clause of the Get channel method.'
          ),
        tenantId: z.string().describe('The ID of the Microsoft Entra tenant.').nullable(),
        webUrl: z
          .string()
          .describe(
            'A hyperlink that will go to the channel in Microsoft Teams. This is the URL that you get when you right-click a channel in Microsoft Teams and select Get link to channel. This URL should be treated as an opaque blob, and not parsed. Read-only.'
          )
          .nullable(),
        allMembers: z
          .array(microsoft_graph_conversationMember)
          .describe(
            'A collection of membership records associated with the channel, including both direct and indirect members of shared channels.'
          ),
        filesFolder: z
          .union([microsoft_graph_driveItem, z.object({}).partial().strict()])
          .describe("Metadata for the location where the channel's files are stored."),
        members: z
          .array(microsoft_graph_conversationMember)
          .describe('A collection of membership records associated with the channel.'),
        messages: z
          .array(microsoft_graph_chatMessage)
          .describe(
            'A collection of all the messages in the channel. A navigation property. Nullable.'
          ),
        sharedWithTeams: z
          .array(microsoft_graph_sharedWithChannelTeamInfo)
          .describe('A collection of teams with which a channel is shared.'),
        tabs: z
          .array(microsoft_graph_teamsTab)
          .describe('A collection of all the tabs in the channel. A navigation property.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_teamsAppInstallation = microsoft_graph_entity.and(
  z
    .object({
      consentedPermissionSet: z
        .union([microsoft_graph_teamsAppPermissionSet, z.object({}).partial().strict()])
        .describe(
          'The set of resource-specific permissions consented to while installing or upgrading the teamsApp.'
        ),
      teamsApp: z
        .union([microsoft_graph_teamsApp, z.object({}).partial().strict()])
        .describe('The app that is installed.'),
      teamsAppDefinition: z
        .union([microsoft_graph_teamsAppDefinition, z.object({}).partial().strict()])
        .describe('The details of this version of the app.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_operationError = z
  .object({
    code: z.string().describe('Operation error code.').nullable(),
    message: z.string().describe('Operation error message.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_teamsAsyncOperationType = z.enum([
  'invalid',
  'cloneTeam',
  'archiveTeam',
  'unarchiveTeam',
  'createTeam',
  'unknownFutureValue',
  'teamifyGroup',
  'createChannel',
  'archiveChannel',
  'unarchiveChannel',
]);
const microsoft_graph_teamsAsyncOperationStatus = z.enum([
  'invalid',
  'notStarted',
  'inProgress',
  'succeeded',
  'failed',
  'unknownFutureValue',
]);
const microsoft_graph_teamsAsyncOperation = microsoft_graph_entity.and(
  z
    .object({
      attemptsCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'Number of times the operation was attempted before being marked successful or failed.'
        ),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Time when the operation was created.'),
      error: z
        .union([microsoft_graph_operationError, z.object({}).partial().strict()])
        .describe('Any error that causes the async operation to fail.'),
      lastActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Time when the async operation was last updated.'),
      operationType: microsoft_graph_teamsAsyncOperationType,
      status: microsoft_graph_teamsAsyncOperationStatus,
      targetResourceId: z
        .string()
        .describe(
          "The ID of the object that's created or modified as result of this async operation, typically a team."
        )
        .nullable(),
      targetResourceLocation: z
        .string()
        .describe(
          "The location of the object that's created or modified as result of this async operation. This URL should be treated as an opaque value and not parsed into its component paths."
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_geoCoordinates = z
  .object({
    altitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe(
        'Optional. The altitude (height), in feet,  above sea level for the item. Read-only.'
      ),
    latitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('Optional. The latitude, in decimal, for the item. Read-only.'),
    longitude: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('Optional. The longitude, in decimal, for the item. Read-only.'),
  })
  .partial()
  .strict();
const microsoft_graph_timeClockSettings = z
  .object({
    approvedLocation: z
      .union([microsoft_graph_geoCoordinates, z.object({}).partial().strict()])
      .describe('The approved location of the timeClock.'),
  })
  .partial()
  .strict();
const microsoft_graph_changeTrackedEntity = microsoft_graph_entity.and(
  z
    .object({
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('Identity of the creator of the entity.'),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      lastModifiedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('Identity of the person who last modified the entity.'),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_dayNote = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      dayNoteDate: z
        .string()
        .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
        .describe('The date of the day note.')
        .nullable(),
      draftDayNote: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe(
          'The draft version of this day note that is viewable by managers. Only contentType text is supported.'
        ),
      sharedDayNote: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe(
          'The shared version of this day note that is viewable by both employees and managers. Only contentType text is supported.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_scheduleChangeRequestActor = z.enum([
  'sender',
  'recipient',
  'manager',
  'system',
  'unknownFutureValue',
]);
const microsoft_graph_scheduleChangeState = z.enum([
  'pending',
  'approved',
  'declined',
  'unknownFutureValue',
]);
const microsoft_graph_scheduleChangeRequest = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      assignedTo: z
        .union([microsoft_graph_scheduleChangeRequestActor, z.object({}).partial().strict()])
        .describe(
          'Indicates who the request is assigned to. Possible values are: sender, recipient, manager, system, unknownFutureValue.'
        ),
      managerActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the manager approved or declined the scheduleChangeRequest. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      managerActionMessage: z
        .string()
        .describe('The message sent by the manager regarding the scheduleChangeRequest. Optional.')
        .nullable(),
      managerUserId: z
        .string()
        .describe('The user ID of the manager who approved or declined the scheduleChangeRequest.')
        .nullable(),
      senderDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the sender sent the scheduleChangeRequest. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      senderMessage: z
        .string()
        .describe('The message sent by the sender of the scheduleChangeRequest. Optional.')
        .nullable(),
      senderUserId: z
        .string()
        .describe('The user ID of the sender of the scheduleChangeRequest.')
        .nullable(),
      state: z
        .union([microsoft_graph_scheduleChangeState, z.object({}).partial().strict()])
        .describe(
          'The state of the scheduleChangeRequest. Possible values are: pending, approved, declined, unknownFutureValue.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_offerShiftRequest = microsoft_graph_scheduleChangeRequest.and(
  z
    .object({
      recipientActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The date and time when the recipient approved or declined the request.')
        .nullable(),
      recipientActionMessage: z
        .string()
        .describe('The message sent by the recipient regarding the request.')
        .nullable(),
      recipientUserId: z.string().describe("The recipient's user ID.").nullable(),
      senderShiftId: z.string().describe("The sender's shift ID.").nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_openShiftChangeRequest = microsoft_graph_scheduleChangeRequest.and(
  z
    .object({ openShiftId: z.string().describe('ID for the open shift.').nullable() })
    .partial()
    .strict()
);
const microsoft_graph_scheduleEntityTheme = z.enum([
  'white',
  'blue',
  'green',
  'purple',
  'pink',
  'yellow',
  'gray',
  'darkBlue',
  'darkGreen',
  'darkPurple',
  'darkPink',
  'darkYellow',
  'unknownFutureValue',
]);
const microsoft_graph_scheduleEntity = z
  .object({
    endDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullable(),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullable(),
    theme: microsoft_graph_scheduleEntityTheme,
  })
  .partial()
  .strict();
const microsoft_graph_shiftActivity = z
  .object({
    code: z.string().describe('Customer defined code for the shiftActivity. Required.').nullable(),
    displayName: z.string().describe('The name of the shiftActivity. Required.').nullable(),
    endDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The end date and time for the shiftActivity. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Required.'
      )
      .nullable(),
    isPaid: z
      .boolean()
      .describe(
        'Indicates whether the microsoft.graph.user should be paid for the activity during their shift. Required.'
      )
      .nullable(),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The start date and time for the shiftActivity. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Required.'
      )
      .nullable(),
    theme: microsoft_graph_scheduleEntityTheme,
  })
  .partial()
  .strict();
const microsoft_graph_shiftItem = microsoft_graph_scheduleEntity.and(
  z
    .object({
      activities: z
        .array(microsoft_graph_shiftActivity)
        .describe(
          'An incremental part of a shift which can cover details of when and where an employee is during their shift. For example, an assignment or a scheduled break or lunch. Required.'
        ),
      displayName: z.string().describe('The shift label of the shiftItem.').nullable(),
      notes: z.string().describe('The shift notes for the shiftItem.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_openShiftItem = microsoft_graph_shiftItem.and(
  z
    .object({
      openSlotCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Count of the number of slots for the given open shift.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_openShift = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      draftOpenShift: z
        .union([microsoft_graph_openShiftItem, z.object({}).partial().strict()])
        .describe(
          "Draft changes in the openShift are only visible to managers until they're shared."
        ),
      isStagedForDeletion: z
        .boolean()
        .describe(
          'The openShift is marked for deletion, a process that is finalized when the schedule is shared.'
        )
        .nullable(),
      schedulingGroupId: z
        .string()
        .describe('The ID of the schedulingGroup that contains the openShift.')
        .nullable(),
      sharedOpenShift: z
        .union([microsoft_graph_openShiftItem, z.object({}).partial().strict()])
        .describe(
          'The shared version of this openShift that is viewable by both employees and managers.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_schedulingGroup = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      code: z
        .string()
        .describe(
          'The code for the schedulingGroup to represent an external identifier. This field must be unique within the team in Microsoft Teams and uses an alphanumeric format, with a maximum of 100 characters.'
        )
        .nullable(),
      displayName: z
        .string()
        .describe('The display name for the schedulingGroup. Required.')
        .nullable(),
      isActive: z
        .boolean()
        .describe(
          'Indicates whether the schedulingGroup can be used when creating new entities or updating existing ones. Required.'
        )
        .nullable(),
      userIds: z
        .array(z.string().nullable())
        .describe('The list of user IDs that are a member of the schedulingGroup. Required.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_shift = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      draftShift: z
        .union([microsoft_graph_shiftItem, z.object({}).partial().strict()])
        .describe(
          "Draft changes in the shift. Draft changes are only visible to managers. The changes are visible to employees when they're shared, which copies the changes from the draftShift to the sharedShift property."
        ),
      isStagedForDeletion: z
        .boolean()
        .describe(
          'The shift is marked for deletion, a process that is finalized when the schedule is shared.'
        )
        .nullable(),
      schedulingGroupId: z
        .string()
        .describe('ID of the scheduling group the shift is part of. Required.')
        .nullable(),
      sharedShift: z
        .union([microsoft_graph_shiftItem, z.object({}).partial().strict()])
        .describe(
          'The shared version of this shift that is viewable by both employees and managers. Updates to the sharedShift property send notifications to users in the Teams client.'
        ),
      userId: z.string().describe('ID of the user assigned to the shift. Required.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_swapShiftsChangeRequest = microsoft_graph_offerShiftRequest.and(
  z
    .object({ recipientShiftId: z.string().describe("The recipient's Shift ID").nullable() })
    .partial()
    .strict()
);
const microsoft_graph_timeCardEvent = z
  .object({
    dateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The time the entry is recorded.'),
    isAtApprovedLocation: z
      .boolean()
      .describe('Indicates whether this action happens at an approved location.')
      .nullable(),
    notes: z
      .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
      .describe('Notes about the timeCardEvent.'),
  })
  .partial()
  .strict();
const microsoft_graph_timeCardBreak = z
  .object({
    breakId: z.string().describe('ID of the timeCardBreak.').nullable(),
    end: z
      .union([microsoft_graph_timeCardEvent, z.object({}).partial().strict()])
      .describe('The start event of the timeCardBreak.'),
    notes: z
      .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
      .describe('Notes about the timeCardBreak.'),
    start: microsoft_graph_timeCardEvent,
  })
  .partial()
  .strict();
const microsoft_graph_confirmedBy = z.enum(['none', 'user', 'manager', 'unknownFutureValue']);
const microsoft_graph_timeCardEntry = z
  .object({
    breaks: z.array(microsoft_graph_timeCardBreak).describe('The clock-in event of the timeCard.'),
    clockInEvent: z
      .union([microsoft_graph_timeCardEvent, z.object({}).partial().strict()])
      .describe('The clock-out event of the timeCard.'),
    clockOutEvent: z
      .union([microsoft_graph_timeCardEvent, z.object({}).partial().strict()])
      .describe('The list of breaks associated with the timeCard.'),
  })
  .partial()
  .strict();
const microsoft_graph_timeCardState = z.enum([
  'clockedIn',
  'onBreak',
  'clockedOut',
  'unknownFutureValue',
]);
const microsoft_graph_timeCard = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      breaks: z
        .array(microsoft_graph_timeCardBreak)
        .describe('The list of breaks associated with the timeCard.'),
      clockInEvent: z
        .union([microsoft_graph_timeCardEvent, z.object({}).partial().strict()])
        .describe('The clock-in event of the timeCard.'),
      clockOutEvent: z
        .union([microsoft_graph_timeCardEvent, z.object({}).partial().strict()])
        .describe('The clock-out event of the timeCard.'),
      confirmedBy: z
        .union([microsoft_graph_confirmedBy, z.object({}).partial().strict()])
        .describe(
          'Indicates whether this timeCard entry is confirmed. Possible values are: none, user, manager, unknownFutureValue.'
        ),
      notes: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe('Notes about the timeCard.'),
      originalEntry: z
        .union([microsoft_graph_timeCardEntry, z.object({}).partial().strict()])
        .describe('The original timeCardEntry of the timeCard before it was edited.'),
      state: z
        .union([microsoft_graph_timeCardState, z.object({}).partial().strict()])
        .describe(
          'The current state of the timeCard during its life cycle. The possible values are: clockedIn, onBreak, clockedOut, unknownFutureValue.'
        ),
      userId: z.string().describe('User ID to which the timeCard belongs.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_timeOffReasonIconType = z.enum([
  'none',
  'car',
  'calendar',
  'running',
  'plane',
  'firstAid',
  'doctor',
  'notWorking',
  'clock',
  'juryDuty',
  'globe',
  'cup',
  'phone',
  'weather',
  'umbrella',
  'piggyBank',
  'dog',
  'cake',
  'trafficCone',
  'pin',
  'sunny',
  'unknownFutureValue',
]);
const microsoft_graph_timeOffReason = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      code: z
        .string()
        .describe(
          'The code of the timeOffReason to represent an external identifier. This field must be unique within the team in Microsoft Teams and uses an alphanumeric format, with a maximum of 100 characters.'
        )
        .nullable(),
      displayName: z.string().describe('The name of the timeOffReason. Required.').nullable(),
      iconType: z
        .union([microsoft_graph_timeOffReasonIconType, z.object({}).partial().strict()])
        .describe(
          'Supported icon types are: none, car, calendar, running, plane, firstAid, doctor, notWorking, clock, juryDuty, globe, cup, phone, weather, umbrella, piggyBank, dog, cake, trafficCone, pin, sunny. Required.'
        ),
      isActive: z
        .boolean()
        .describe(
          'Indicates whether the timeOffReason can be used when creating new entities or updating existing ones. Required.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_timeOffRequest = microsoft_graph_scheduleChangeRequest.and(
  z
    .object({
      endDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The date and time the time off ends in ISO 8601 format and in UTC time.')
        .nullable(),
      startDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The date and time the time off starts in ISO 8601 format and in UTC time.')
        .nullable(),
      timeOffReasonId: z.string().describe('The reason for the time off.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_timeOffItem = microsoft_graph_scheduleEntity.and(
  z
    .object({
      timeOffReasonId: z
        .string()
        .describe('ID of the timeOffReason for this timeOffItem. Required.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_timeOff = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      draftTimeOff: z
        .union([microsoft_graph_timeOffItem, z.object({}).partial().strict()])
        .describe(
          "The draft version of this timeOff item that is viewable by managers. It must be shared before it's visible to team members. Required."
        ),
      isStagedForDeletion: z
        .boolean()
        .describe(
          'The timeOff is marked for deletion, a process that is finalized when the schedule is shared.'
        )
        .nullable(),
      sharedTimeOff: z
        .union([microsoft_graph_timeOffItem, z.object({}).partial().strict()])
        .describe(
          'The shared version of this timeOff that is viewable by both employees and managers. Updates to the sharedTimeOff property send notifications to users in the Teams client. Required.'
        ),
      userId: z.string().describe('ID of the user assigned to the timeOff. Required.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_schedule = microsoft_graph_entity.and(
  z
    .object({
      enabled: z
        .boolean()
        .describe('Indicates whether the schedule is enabled for the team. Required.')
        .nullable(),
      isActivitiesIncludedWhenCopyingShiftsEnabled: z
        .boolean()
        .describe('Indicates whether copied shifts include activities from the original shift.')
        .nullable(),
      offerShiftRequestsEnabled: z
        .boolean()
        .describe('Indicates whether offer shift requests are enabled for the schedule.')
        .nullable(),
      openShiftsEnabled: z
        .boolean()
        .describe('Indicates whether open shifts are enabled for the schedule.')
        .nullable(),
      provisionStatus: z
        .union([microsoft_graph_operationStatus, z.object({}).partial().strict()])
        .describe(
          'The status of the schedule provisioning. The possible values are notStarted, running, completed, failed.'
        ),
      provisionStatusCode: z
        .string()
        .describe('Additional information about why schedule provisioning failed.')
        .nullable(),
      startDayOfWeek: z
        .union([microsoft_graph_dayOfWeek, z.object({}).partial().strict()])
        .describe(
          'Indicates the start day of the week. The possible values are: sunday, monday, tuesday, wednesday, thursday, friday, saturday.'
        ),
      swapShiftsRequestsEnabled: z
        .boolean()
        .describe('Indicates whether swap shifts requests are enabled for the schedule.')
        .nullable(),
      timeClockEnabled: z
        .boolean()
        .describe('Indicates whether time clock is enabled for the schedule.')
        .nullable(),
      timeClockSettings: z
        .union([microsoft_graph_timeClockSettings, z.object({}).partial().strict()])
        .describe('The time clock location settings for this schedule.'),
      timeOffRequestsEnabled: z
        .boolean()
        .describe('Indicates whether time off requests are enabled for the schedule.')
        .nullable(),
      timeZone: z
        .string()
        .describe(
          'Indicates the time zone of the schedule team using tz database format. Required.'
        )
        .nullable(),
      workforceIntegrationIds: z
        .array(z.string().nullable())
        .describe('The IDs for the workforce integrations associated with this schedule.'),
      dayNotes: z.array(microsoft_graph_dayNote).describe('The day notes in the schedule.'),
      offerShiftRequests: z
        .array(microsoft_graph_offerShiftRequest)
        .describe('The offer requests for shifts in the schedule.'),
      openShiftChangeRequests: z
        .array(microsoft_graph_openShiftChangeRequest)
        .describe('The open shift requests in the schedule.'),
      openShifts: z
        .array(microsoft_graph_openShift)
        .describe('The set of open shifts in a scheduling group in the schedule.'),
      schedulingGroups: z
        .array(microsoft_graph_schedulingGroup)
        .describe('The logical grouping of users in the schedule (usually by role).'),
      shifts: z.array(microsoft_graph_shift).describe('The shifts in the schedule.'),
      swapShiftsChangeRequests: z
        .array(microsoft_graph_swapShiftsChangeRequest)
        .describe('The swap requests for shifts in the schedule.'),
      timeCards: z.array(microsoft_graph_timeCard).describe('The time cards in the schedule.'),
      timeOffReasons: z
        .array(microsoft_graph_timeOffReason)
        .describe('The set of reasons for a time off in the schedule.'),
      timeOffRequests: z
        .array(microsoft_graph_timeOffRequest)
        .describe('The time off requests in the schedule.'),
      timesOff: z
        .array(microsoft_graph_timeOff)
        .describe('The instances of times off in the schedule.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_teamworkTagType = z.enum(['standard', 'unknownFutureValue']);
const microsoft_graph_teamworkTagMember = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().describe("The member's display name.").nullable(),
      tenantId: z
        .string()
        .describe('The ID of the tenant that the tag member is a part of.')
        .nullable(),
      userId: z.string().describe('The user ID of the member.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_teamworkTag = microsoft_graph_entity.and(
  z
    .object({
      description: z
        .string()
        .describe(
          "The description of the tag as it appears to the user in Microsoft Teams. A teamworkTag can't have more than 200 teamworkTagMembers."
        )
        .nullable(),
      displayName: z
        .string()
        .describe('The name of the tag as it appears to the user in Microsoft Teams.')
        .nullable(),
      memberCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The number of users assigned to the tag.')
        .nullable(),
      tagType: z
        .union([microsoft_graph_teamworkTagType, z.object({}).partial().strict()])
        .describe('The type of the tag. Default is standard.'),
      teamId: z.string().describe('ID of the team in which the tag is defined.').nullable(),
      members: z.array(microsoft_graph_teamworkTagMember).describe('Users assigned to the tag.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_teamsTemplate = microsoft_graph_entity.and(z.object({}).partial().strict());
const microsoft_graph_team: z.ZodType<microsoft_graph_team> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        classification: z
          .string()
          .describe(
            "An optional label. Typically describes the data or business sensitivity of the team. Must match one of a preconfigured set in the tenant's directory."
          )
          .nullable(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Timestamp at which the team was created.')
          .nullable(),
        description: z
          .string()
          .describe('An optional description for the team. Maximum length: 1,024 characters.')
          .nullable(),
        displayName: z.string().describe('The name of the team.').nullable(),
        firstChannelName: z
          .string()
          .describe(
            "The name of the first channel in the team. This is an optional property, only used during team creation and isn't returned in methods to get and list teams."
          )
          .nullable(),
        funSettings: z
          .union([microsoft_graph_teamFunSettings, z.object({}).partial().strict()])
          .describe('Settings to configure use of Giphy, memes, and stickers in the team.'),
        guestSettings: z
          .union([microsoft_graph_teamGuestSettings, z.object({}).partial().strict()])
          .describe(
            'Settings to configure whether guests can create, update, or delete channels in the team.'
          ),
        internalId: z
          .string()
          .describe(
            'A unique ID for the team that was used in a few places such as the audit log/Office 365 Management Activity API.'
          )
          .nullable(),
        isArchived: z.boolean().describe('Whether this team is in read-only mode.').nullable(),
        memberSettings: z
          .union([microsoft_graph_teamMemberSettings, z.object({}).partial().strict()])
          .describe(
            'Settings to configure whether members can perform certain actions, for example, create channels and add bots, in the team.'
          ),
        messagingSettings: z
          .union([microsoft_graph_teamMessagingSettings, z.object({}).partial().strict()])
          .describe('Settings to configure messaging and mentions in the team.'),
        specialization: z
          .union([microsoft_graph_teamSpecialization, z.object({}).partial().strict()])
          .describe(
            'Optional. Indicates whether the team is intended for a particular use case. Each team specialization has access to unique behaviors and experiences targeted to its use case.'
          ),
        summary: z
          .union([microsoft_graph_teamSummary, z.object({}).partial().strict()])
          .describe(
            'Contains summary information about the team, including number of owners, members, and guests.'
          ),
        tenantId: z.string().describe('The ID of the Microsoft Entra tenant.').nullable(),
        visibility: z
          .union([microsoft_graph_teamVisibilityType, z.object({}).partial().strict()])
          .describe('The visibility of the group and team. Defaults to Public.'),
        webUrl: z
          .string()
          .describe(
            'A hyperlink that goes to the team in the Microsoft Teams client. You get this URL when you right-click a team in the Microsoft Teams client and select Get link to team. This URL should be treated as an opaque blob, and not parsed.'
          )
          .nullable(),
        allChannels: z
          .array(microsoft_graph_channel)
          .describe(
            'List of channels either hosted in or shared with the team (incoming channels).'
          ),
        channels: z
          .array(microsoft_graph_channel)
          .describe('The collection of channels and messages associated with the team.'),
        group: z.union([microsoft_graph_group, z.object({}).partial().strict()]),
        incomingChannels: z
          .array(microsoft_graph_channel)
          .describe('List of channels shared with the team.'),
        installedApps: z
          .array(microsoft_graph_teamsAppInstallation)
          .describe('The apps installed in this team.'),
        members: z
          .array(microsoft_graph_conversationMember)
          .describe('Members and owners of the team.'),
        operations: z
          .array(microsoft_graph_teamsAsyncOperation)
          .describe('The async operations that ran or are running on this team.'),
        permissionGrants: z
          .array(microsoft_graph_resourceSpecificPermissionGrant)
          .describe('A collection of permissions granted to apps to access the team.'),
        photo: z
          .union([microsoft_graph_profilePhoto, z.object({}).partial().strict()])
          .describe('The profile photo for the team.'),
        primaryChannel: z
          .union([microsoft_graph_channel, z.object({}).partial().strict()])
          .describe('The general channel for the team.'),
        schedule: z
          .union([microsoft_graph_schedule, z.object({}).partial().strict()])
          .describe('The schedule of shifts for this team.'),
        tags: z.array(microsoft_graph_teamworkTag).describe('The tags associated with the team.'),
        template: z
          .union([microsoft_graph_teamsTemplate, z.object({}).partial().strict()])
          .describe('The template this team was created from. See available templates.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_group: z.ZodType<microsoft_graph_group> = z.lazy(() =>
  microsoft_graph_directoryObject.and(
    z
      .object({
        allowExternalSenders: z
          .boolean()
          .describe(
            'Indicates if people external to the organization can send messages to the group. The default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).'
          )
          .nullable(),
        assignedLabels: z
          .array(microsoft_graph_assignedLabel)
          .describe(
            'The list of sensitivity label pairs (label ID, label name) associated with a Microsoft 365 group. Returned only on $select. This property can be updated only in delegated scenarios where the caller requires both the Microsoft Graph permission and a supported administrator role.'
          ),
        assignedLicenses: z
          .array(microsoft_graph_assignedLicense)
          .describe(
            'The licenses that are assigned to the group. Returned only on $select. Supports $filter (eq). Read-only.'
          ),
        autoSubscribeNewMembers: z
          .boolean()
          .describe(
            "Indicates if new members added to the group are autosubscribed to receive email notifications. You can set this property in a PATCH request for the group; don't set it in the initial POST request that creates the group. Default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID})."
          )
          .nullable(),
        classification: z
          .string()
          .describe(
            'Describes a classification for the group (such as low, medium, or high business impact). Valid values for this property are defined by creating a ClassificationList setting value, based on the template definition.Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
          )
          .nullable(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "Timestamp of when the group was created. The value can't be modified and is automatically populated when the group is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Read-only."
          )
          .nullable(),
        description: z
          .string()
          .describe(
            'An optional description for the group. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith) and $search.'
          )
          .nullable(),
        displayName: z
          .string()
          .describe(
            "The display name for the group. This property is required when a group is created and can't be cleared during updates. Maximum length is 256 characters. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values), $search, and $orderby."
          )
          .nullable(),
        expirationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "Timestamp of when the group is set to expire. It's null for security groups, but for Microsoft 365 groups, it represents when the group is set to expire as defined in the groupLifecyclePolicy. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Supports $filter (eq, ne, not, ge, le, in). Read-only."
          )
          .nullable(),
        groupTypes: z
          .array(z.string())
          .describe(
            "Specifies the group type and its membership. If the collection contains Unified, the group is a Microsoft 365 group; otherwise, it's either a security group or a distribution group. For details, see groups overview.If the collection includes DynamicMembership, the group has dynamic membership; otherwise, membership is static. Returned by default. Supports $filter (eq, not)."
          ),
        hasMembersWithLicenseErrors: z
          .boolean()
          .describe(
            'Indicates whether there are members in this group that have license errors from its group-based license assignment. This property is never returned on a GET operation. You can use it as a $filter argument to get groups that have members with license errors (that is, filter for this property being true). See an example. Supports $filter (eq).'
          )
          .nullable(),
        hideFromAddressLists: z
          .boolean()
          .describe(
            "True if the group isn't displayed in certain parts of the Outlook UI: the Address Book, address lists for selecting message recipients, and the Browse Groups dialog for searching groups; otherwise, false. The default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID})."
          )
          .nullable(),
        hideFromOutlookClients: z
          .boolean()
          .describe(
            "True if the group isn't displayed in Outlook clients, such as Outlook for Windows and Outlook on the web; otherwise, false. The default value is false. Returned only on $select. Supported only on the Get group API (GET /groups/{ID})."
          )
          .nullable(),
        isArchived: z
          .boolean()
          .describe(
            'When a group is associated with a team, this property determines whether the team is in read-only mode.To read this property, use the /group/{groupId}/team endpoint or the Get team API. To update this property, use the archiveTeam and unarchiveTeam APIs.'
          )
          .nullable(),
        isAssignableToRole: z
          .boolean()
          .describe(
            "Indicates whether this group can be assigned to a Microsoft Entra role. Optional. This property can only be set while creating the group and is immutable. If set to true, the securityEnabled property must also be set to true, visibility must be Hidden, and the group can't be a dynamic group (that is, groupTypes can't contain DynamicMembership). Only callers with at least the Privileged Role Administrator role can set this property. The caller must also be assigned the RoleManagement.ReadWrite.Directory permission to set this property or update the membership of such groups. For more, see Using a group to manage Microsoft Entra role assignmentsUsing this feature requires a Microsoft Entra ID P1 license. Returned by default. Supports $filter (eq, ne, not)."
          )
          .nullable(),
        isManagementRestricted: z.boolean().nullable(),
        isSubscribedByMail: z
          .boolean()
          .describe(
            'Indicates whether the signed-in user is subscribed to receive email conversations. The default value is true. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).'
          )
          .nullable(),
        licenseProcessingState: z
          .union([microsoft_graph_licenseProcessingState, z.object({}).partial().strict()])
          .describe(
            'Indicates the status of the group license assignment to all group members. The default value is false. Read-only. Possible values: QueuedForProcessing, ProcessingInProgress, and ProcessingComplete.Returned only on $select. Read-only.'
          ),
        mail: z
          .string()
          .describe(
            "The SMTP address for the group, for example, 'serviceadmins@contoso.com'. Returned by default. Read-only. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        mailEnabled: z
          .boolean()
          .describe(
            'Specifies whether the group is mail-enabled. Required. Returned by default. Supports $filter (eq, ne, not).'
          )
          .nullable(),
        mailNickname: z
          .string()
          .describe(
            "The mail alias for the group, unique for Microsoft 365 groups in the organization. Maximum length is 64 characters. This property can contain only characters in the ASCII character set 0 - 127 except the following characters: @ () / [] ' ; : <> , SPACE. Required. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        membershipRule: z
          .string()
          .describe(
            'The rule that determines members for this group if the group is a dynamic group (groupTypes contains DynamicMembership). For more information about the syntax of the membership rule, see Membership Rules syntax. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
          )
          .nullable(),
        membershipRuleProcessingState: z
          .string()
          .describe(
            'Indicates whether the dynamic membership processing is on or paused. Possible values are On or Paused. Returned by default. Supports $filter (eq, ne, not, in).'
          )
          .nullable(),
        onPremisesDomainName: z
          .string()
          .describe(
            'Contains the on-premises domain FQDN, also called dnsDomainName synchronized from the on-premises directory. The property is only populated for customers synchronizing their on-premises directory to Microsoft Entra ID via Microsoft Entra Connect.Returned by default. Read-only.'
          )
          .nullable(),
        onPremisesLastSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Indicates the last time at which the group was synced with the on-premises directory. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Read-only. Supports $filter (eq, ne, not, ge, le, in).'
          )
          .nullable(),
        onPremisesNetBiosName: z
          .string()
          .describe(
            'Contains the on-premises netBios name synchronized from the on-premises directory. The property is only populated for customers synchronizing their on-premises directory to Microsoft Entra ID via Microsoft Entra Connect.Returned by default. Read-only.'
          )
          .nullable(),
        onPremisesProvisioningErrors: z
          .array(microsoft_graph_onPremisesProvisioningError)
          .describe(
            'Errors when using Microsoft synchronization product during provisioning. Returned by default. Supports $filter (eq, not).'
          ),
        onPremisesSamAccountName: z
          .string()
          .describe(
            'Contains the on-premises SAM account name synchronized from the on-premises directory. The property is only populated for customers synchronizing their on-premises directory to Microsoft Entra ID via Microsoft Entra Connect.Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith). Read-only.'
          )
          .nullable(),
        onPremisesSecurityIdentifier: z
          .string()
          .describe(
            'Contains the on-premises security identifier (SID) for the group synchronized from on-premises to the cloud. Read-only. Returned by default. Supports $filter (eq including on null values).'
          )
          .nullable(),
        onPremisesSyncEnabled: z
          .boolean()
          .describe(
            'true if this group is synced from an on-premises directory; false if this group was originally synced from an on-premises directory but is no longer synced; null if this object has never synced from an on-premises directory (default). Returned by default. Read-only. Supports $filter (eq, ne, not, in, and eq on null values).'
          )
          .nullable(),
        preferredDataLocation: z
          .string()
          .describe(
            "The preferred data location for the Microsoft 365 group. By default, the group inherits the group creator's preferred data location. To set this property, the calling app must be granted the Directory.ReadWrite.All permission and the user be assigned at least one of the following Microsoft Entra roles: User Account Administrator Directory Writer  Exchange Administrator  SharePoint Administrator  For more information about this property, see OneDrive Online Multi-Geo. Nullable. Returned by default."
          )
          .nullable(),
        preferredLanguage: z
          .string()
          .describe(
            'The preferred language for a Microsoft 365 group. Should follow ISO 639-1 Code; for example, en-US. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        proxyAddresses: z
          .array(z.string())
          .describe(
            "Email addresses for the group that direct to the same group mailbox. For example: ['SMTP: bob@contoso.com', 'smtp: bob@sales.contoso.com']. The any operator is required to filter expressions on multi-valued properties. Returned by default. Read-only. Not nullable. Supports $filter (eq, not, ge, le, startsWith, endsWith, /$count eq 0, /$count ne 0)."
          ),
        renewedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "Timestamp of when the group was last renewed. This value can't be modified directly and is only updated via the renew service action. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Supports $filter (eq, ne, not, ge, le, in). Read-only."
          )
          .nullable(),
        securityEnabled: z
          .boolean()
          .describe(
            'Specifies whether the group is a security group. Required. Returned by default. Supports $filter (eq, ne, not, in).'
          )
          .nullable(),
        securityIdentifier: z
          .string()
          .describe(
            'Security identifier of the group, used in Windows scenarios. Read-only. Returned by default.'
          )
          .nullable(),
        serviceProvisioningErrors: z
          .array(microsoft_graph_serviceProvisioningError)
          .describe(
            'Errors published by a federated service describing a nontransient, service-specific error regarding the properties or link from a group object.  Supports $filter (eq, not, for isResolved and serviceInstance).'
          ),
        theme: z
          .string()
          .describe(
            "Specifies a Microsoft 365 group's color theme. Possible values are Teal, Purple, Green, Blue, Pink, Orange, or Red. Returned by default."
          )
          .nullable(),
        uniqueName: z
          .string()
          .describe(
            'The unique identifier that can be assigned to a group and used as an alternate key. Immutable. Read-only.'
          )
          .nullable(),
        unseenCount: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe(
            'Count of conversations that received new posts since the signed-in user last visited the group. Returned only on $select. Supported only on the Get group API (GET /groups/{ID}).'
          )
          .nullable(),
        visibility: z
          .string()
          .describe(
            "Specifies the group join policy and group content visibility for groups. Possible values are: Private, Public, or HiddenMembership. HiddenMembership can be set only for Microsoft 365 groups when the groups are created. It can't be updated later. Other values of visibility can be updated after group creation. If visibility value isn't specified during group creation on Microsoft Graph, a security group is created as Private by default, and the Microsoft 365 group is Public. Groups assignable to roles are always Private. To learn more, see group visibility options. Returned by default. Nullable."
          )
          .nullable(),
        acceptedSenders: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'The list of users or groups allowed to create posts or calendar events in this group. If this list is nonempty, then only users or groups listed here are allowed to post.'
          ),
        appRoleAssignments: z
          .array(microsoft_graph_appRoleAssignment)
          .describe(
            'Represents the app roles granted to a group for an application. Supports $expand.'
          ),
        calendar: z
          .union([microsoft_graph_calendar, z.object({}).partial().strict()])
          .describe("The group's calendar. Read-only."),
        calendarView: z
          .array(microsoft_graph_event)
          .describe('The calendar view for the calendar. Read-only.'),
        conversations: z.array(microsoft_graph_conversation).describe("The group's conversations."),
        createdOnBehalfOf: z
          .union([microsoft_graph_directoryObject, z.object({}).partial().strict()])
          .describe(
            "The user (or application) that created the group. NOTE: This property isn't set if the user is an administrator. Read-only."
          ),
        drive: z
          .union([microsoft_graph_drive, z.object({}).partial().strict()])
          .describe("The group's default drive. Read-only."),
        drives: z.array(microsoft_graph_drive).describe("The group's drives. Read-only."),
        events: z.array(microsoft_graph_event).describe("The group's calendar events."),
        extensions: z
          .array(microsoft_graph_extension)
          .describe(
            'The collection of open extensions defined for the group. Read-only. Nullable.'
          ),
        groupLifecyclePolicies: z
          .array(microsoft_graph_groupLifecyclePolicy)
          .describe('The collection of lifecycle policies for this group. Read-only. Nullable.'),
        memberOf: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'Groups that this group is a member of. HTTP Methods: GET (supported for all groups). Read-only. Nullable. Supports $expand.'
          ),
        members: z
          .array(microsoft_graph_directoryObject)
          .describe(
            "The members of this group, who can be users, devices, other groups, or service principals. Supports the List members, Add member, and Remove member operations. Nullable. Supports $expand including nested $select. For example, /groups?$filter=startsWith(displayName,'Role')&$select=id,displayName&$expand=members($select=id,userPrincipalName,displayName)."
          ),
        membersWithLicenseErrors: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'A list of group members with license errors from this group-based license assignment. Read-only.'
          ),
        onenote: z.union([microsoft_graph_onenote, z.object({}).partial().strict()]),
        owners: z
          .array(microsoft_graph_directoryObject)
          .describe(
            "The owners of the group who can be users or service principals. Limited to 100 owners. Nullable. If this property isn't specified when creating a Microsoft 365 group the calling user (admin or non-admin) is automatically assigned as the group owner. A non-admin user can't explicitly add themselves to this collection when they're creating the group. For more information, see the related known issue. For security groups, the admin user isn't automatically added to this collection. For more information, see the related known issue. Supports $filter (/$count eq 0, /$count ne 0, /$count eq 1, /$count ne 1); Supports $expand including nested $select. For example, /groups?$filter=startsWith(displayName,'Role')&$select=id,displayName&$expand=owners($select=id,userPrincipalName,displayName)."
          ),
        permissionGrants: z.array(microsoft_graph_resourceSpecificPermissionGrant),
        photo: z
          .union([microsoft_graph_profilePhoto, z.object({}).partial().strict()])
          .describe("The group's profile photo"),
        photos: z
          .array(microsoft_graph_profilePhoto)
          .describe('The profile photos owned by the group. Read-only. Nullable.'),
        planner: z
          .union([microsoft_graph_plannerGroup, z.object({}).partial().strict()])
          .describe('Entry-point to Planner resource that might exist for a Unified Group.'),
        rejectedSenders: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'The list of users or groups not allowed to create posts or calendar events in this group. Nullable'
          ),
        settings: z
          .array(microsoft_graph_groupSetting)
          .describe(
            "Settings that can govern this group's behavior, like whether members can invite guests to the group. Nullable."
          ),
        sites: z
          .array(microsoft_graph_site)
          .describe(
            'The list of SharePoint sites in this group. Access the default site with /sites/root.'
          ),
        team: z
          .union([microsoft_graph_team, z.object({}).partial().strict()])
          .describe('The team associated with this group.'),
        threads: z
          .array(microsoft_graph_conversationThread)
          .describe("The group's conversation threads. Nullable."),
        transitiveMemberOf: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'The groups that a group is a member of, either directly or through nested membership. Nullable.'
          ),
        transitiveMembers: z
          .array(microsoft_graph_directoryObject)
          .describe('The direct and transitive members of a group. Nullable.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_printConnector = microsoft_graph_entity.and(
  z
    .object({
      appVersion: z.string().describe("The connector's version."),
      displayName: z.string().describe('The name of the connector.'),
      fullyQualifiedDomainName: z.string().describe("The connector machine's hostname."),
      location: z
        .union([microsoft_graph_printerLocation, z.object({}).partial().strict()])
        .describe('The physical and/or organizational location of the connector.'),
      operatingSystem: z.string().describe("The connector machine's operating system version."),
      registeredDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The DateTimeOffset when the connector was registered.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_printer: z.ZodType<microsoft_graph_printer> = z.lazy(() =>
  microsoft_graph_printerBase.and(
    z
      .object({
        hasPhysicalDevice: z
          .boolean()
          .describe('True if the printer has a physical device for printing. Read-only.'),
        isShared: z
          .boolean()
          .describe('True if the printer is shared; false otherwise. Read-only.'),
        lastSeenDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The most recent dateTimeOffset when a printer interacted with Universal Print. Read-only.'
          )
          .nullable(),
        registeredDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('The DateTimeOffset when the printer was registered. Read-only.'),
        connectors: z
          .array(microsoft_graph_printConnector)
          .describe('The connectors that are associated with the printer.'),
        shares: z
          .array(microsoft_graph_printerShare)
          .describe(
            'The list of printerShares that are associated with the printer. Currently, only one printerShare can be associated with the printer. Read-only. Nullable.'
          ),
        taskTriggers: z
          .array(microsoft_graph_printTaskTrigger)
          .describe('A list of task triggers that are associated with the printer.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_printerShare: z.ZodType<microsoft_graph_printerShare> = z.lazy(() =>
  microsoft_graph_printerBase.and(
    z
      .object({
        allowAllUsers: z
          .boolean()
          .describe(
            'If true, all users and groups will be granted access to this printer share. This supersedes the allow lists defined by the allowedUsers and allowedGroups navigation properties.'
          ),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('The DateTimeOffset when the printer share was created. Read-only.'),
        viewPoint: z
          .union([microsoft_graph_printerShareViewpoint, z.object({}).partial().strict()])
          .describe('Additional data for a printer share as viewed by the signed-in user.'),
        allowedGroups: z
          .array(microsoft_graph_group)
          .describe('The groups whose users have access to print using the printer.'),
        allowedUsers: z
          .array(microsoft_graph_user)
          .describe('The users who have access to print using the printer.'),
        printer: z
          .union([microsoft_graph_printer, z.object({}).partial().strict()])
          .describe('The printer that this printer share is related to.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_userPrint: z.ZodType<microsoft_graph_userPrint> = z.lazy(() =>
  z
    .object({ recentPrinterShares: z.array(microsoft_graph_printerShare) })
    .partial()
    .strict()
);
const microsoft_graph_provisionedPlan = z
  .object({
    capabilityStatus: z
      .string()
      .describe(
        'Condition of the capability assignment. The possible values are Enabled, Warning, Suspended, Deleted, LockedOut. See a detailed description of each value.'
      )
      .nullable(),
    provisioningStatus: z
      .string()
      .describe(
        "The possible values are:Success - Service is fully provisioned.Disabled - Service is disabled.Error - The service plan isn't provisioned and is in an error state.PendingInput - The service isn't provisioned and is awaiting service confirmation.PendingActivation - The service is provisioned but requires explicit activation by an administrator (for example, Intune_O365 service plan)PendingProvisioning - Microsoft has added a new service to the product SKU and it isn't activated in the tenant."
      )
      .nullable(),
    service: z
      .string()
      .describe("The name of the service; for example, 'AccessControlS2S'.")
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_signInActivity = z
  .object({
    lastNonInteractiveSignInDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The last non-interactive sign-in date for a specific user. You can use this field to calculate the last time a client attempted (either successfully or unsuccessfully) to sign in to the directory on behalf of a user. Because some users may use clients to access tenant resources rather than signing into your tenant directly, you can use the non-interactive sign-in date to along with lastSignInDateTime to identify inactive users. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Microsoft Entra ID maintains non-interactive sign-ins going back to May 2020. For more information about using the value of this property, see Manage inactive user accounts in Microsoft Entra ID.'
      )
      .nullable(),
    lastNonInteractiveSignInRequestId: z
      .string()
      .describe('Request identifier of the last non-interactive sign-in performed by this user.')
      .nullable(),
    lastSignInDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The last interactive sign-in date and time for a specific user. This property records the last time a user attempted an interactive sign-in to the directory—whether the attempt was successful or not. Note: Since unsuccessful attempts are also logged, this value might not accurately reflect actual system usage. For tracking actual account access, please use the lastSuccessfulSignInDateTime property. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullable(),
    lastSignInRequestId: z
      .string()
      .describe('Request identifier of the last interactive sign-in performed by this user.')
      .nullable(),
    lastSuccessfulSignInDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "The date and time of the user's most recent successful interactive or non-interactive sign-in. Use this property if you need to determine when the account was truly accessed. This field can be used to build reports, such as inactive users. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Microsoft Entra ID maintains interactive sign-ins going back to April 2020. For more information about using the value of this property, see Manage inactive user accounts in Microsoft Entra ID."
      )
      .nullable(),
    lastSuccessfulSignInRequestId: z
      .string()
      .describe('The request ID of the last successful sign-in.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_status = z.enum([
  'active',
  'updated',
  'deleted',
  'ignored',
  'unknownFutureValue',
]);
const microsoft_graph_imageInfo = z
  .object({
    addImageQuery: z
      .boolean()
      .describe(
        'Optional; parameter used to indicate the server is able to render image dynamically in response to parameterization. For example – a high contrast image'
      )
      .nullable(),
    alternateText: z
      .string()
      .describe('Optional; alt-text accessible content for the image')
      .nullable(),
    alternativeText: z.string().nullable(),
    iconUrl: z
      .string()
      .describe(
        'Optional; URI that points to an icon which represents the application used to generate the activity'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_visualInfo = z
  .object({
    attribution: z
      .union([microsoft_graph_imageInfo, z.object({}).partial().strict()])
      .describe(
        'Optional. JSON object used to represent an icon which represents the application used to generate the activity'
      ),
    backgroundColor: z
      .string()
      .describe(
        'Optional. Background color used to render the activity in the UI - brand color for the application source of the activity. Must be a valid hex color'
      )
      .nullable(),
    content: z
      .unknown()
      .describe(
        'Optional. Custom piece of data - JSON object used to provide custom content to render the activity in the Windows Shell UI'
      ),
    description: z
      .string()
      .describe(
        "Optional. Longer text description of the user's unique activity (example: document name, first sentence, and/or metadata)"
      )
      .nullable(),
    displayText: z
      .string()
      .describe(
        "Required. Short text description of the user's unique activity (for example, document name in cases where an activity refers to document creation)"
      ),
  })
  .partial()
  .strict();
const microsoft_graph_activityHistoryItem: z.ZodType<microsoft_graph_activityHistoryItem> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          activeDurationSeconds: z
            .number()
            .gte(-2147483648)
            .lte(2147483647)
            .describe(
              'Optional. The duration of active user engagement. if not supplied, this is calculated from the startedDateTime and lastActiveDateTime.'
            )
            .nullable(),
          createdDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .describe(
              'Set by the server. DateTime in UTC when the object was created on the server.'
            )
            .nullable(),
          expirationDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .describe(
              'Optional. UTC DateTime when the activityHistoryItem will undergo hard-delete. Can be set by the client.'
            )
            .nullable(),
          lastActiveDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .describe(
              'Optional. UTC DateTime when the activityHistoryItem (activity session) was last understood as active or finished - if null, activityHistoryItem status should be Ongoing.'
            )
            .nullable(),
          lastModifiedDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .describe(
              'Set by the server. DateTime in UTC when the object was modified on the server.'
            )
            .nullable(),
          startedDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .describe(
              'Required. UTC DateTime when the activityHistoryItem (activity session) was started. Required for timeline history.'
            ),
          status: z
            .union([microsoft_graph_status, z.object({}).partial().strict()])
            .describe(
              'Set by the server. A status code used to identify valid objects. Values: active, updated, deleted, ignored.'
            ),
          userTimezone: z
            .string()
            .describe(
              "Optional. The timezone in which the user's device used to generate the activity was located at activity creation time. Values supplied as Olson IDs in order to support cross-platform representation."
            )
            .nullable(),
          activity: microsoft_graph_userActivity,
        })
        .partial()
        .strict()
    )
);
const microsoft_graph_userActivity: z.ZodType<microsoft_graph_userActivity> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        activationUrl: z
          .string()
          .describe(
            'Required. URL used to launch the activity in the best native experience represented by the appId. Might launch a web-based app if no native app exists.'
          ),
        activitySourceHost: z
          .string()
          .describe(
            'Required. URL for the domain representing the cross-platform identity mapping for the app. Mapping is stored either as a JSON file hosted on the domain or configurable via Windows Dev Center. The JSON file is named cross-platform-app-identifiers and is hosted at root of your HTTPS domain, either at the top level domain or include a sub domain. For example: https://contoso.com or https://myapp.contoso.com but NOT https://myapp.contoso.com/somepath. You must have a unique file and domain (or sub domain) per cross-platform app identity. For example, a separate file and domain is needed for Word vs. PowerPoint.'
          ),
        appActivityId: z
          .string()
          .describe(
            'Required. The unique activity ID in the context of the app - supplied by caller and immutable thereafter.'
          ),
        appDisplayName: z
          .string()
          .describe(
            'Optional. Short text description of the app used to generate the activity for use in cases when the app is not installed on the user’s local device.'
          )
          .nullable(),
        contentInfo: z
          .unknown()
          .describe(
            'Optional. A custom piece of data - JSON-LD extensible description of content according to schema.org syntax.'
          ),
        contentUrl: z
          .string()
          .describe(
            'Optional. Used in the event the content can be rendered outside of a native or web-based app experience (for example, a pointer to an item in an RSS feed).'
          )
          .nullable(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Set by the server. DateTime in UTC when the object was created on the server.')
          .nullable(),
        expirationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Set by the server. DateTime in UTC when the object expired on the server.')
          .nullable(),
        fallbackUrl: z
          .string()
          .describe('Optional. URL used to launch the activity in a web-based app, if available.')
          .nullable(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Set by the server. DateTime in UTC when the object was modified on the server.'
          )
          .nullable(),
        status: z
          .union([microsoft_graph_status, z.object({}).partial().strict()])
          .describe(
            'Set by the server. A status code used to identify valid objects. Values: active, updated, deleted, ignored.'
          ),
        userTimezone: z
          .string()
          .describe(
            "Optional. The timezone in which the user's device used to generate the activity was located at activity creation time; values supplied as Olson IDs in order to support cross-platform representation."
          )
          .nullable(),
        visualElements: microsoft_graph_visualInfo,
        historyItems: z
          .array(microsoft_graph_activityHistoryItem)
          .describe(
            "Optional. NavigationProperty/Containment; navigation property to the activity's historyItems."
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_agreementAcceptanceState = z.enum([
  'accepted',
  'declined',
  'unknownFutureValue',
]);
const microsoft_graph_agreementAcceptance = microsoft_graph_entity.and(
  z
    .object({
      agreementFileId: z
        .string()
        .describe('The identifier of the agreement file accepted by the user.')
        .nullable(),
      agreementId: z.string().describe('The identifier of the agreement.').nullable(),
      deviceDisplayName: z
        .string()
        .describe('The display name of the device used for accepting the agreement.')
        .nullable(),
      deviceId: z
        .string()
        .describe(
          'The unique identifier of the device used for accepting the agreement. Supports $filter (eq) and eq for null values.'
        )
        .nullable(),
      deviceOSType: z
        .string()
        .describe('The operating system used to accept the agreement.')
        .nullable(),
      deviceOSVersion: z
        .string()
        .describe('The operating system version of the device used to accept the agreement.')
        .nullable(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The expiration date time of the acceptance. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Supports $filter (eq, ge, le) and eq for null values.'
        )
        .nullable(),
      recordedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      state: z
        .union([microsoft_graph_agreementAcceptanceState, z.object({}).partial().strict()])
        .describe(
          'The state of the agreement acceptance. Possible values are: accepted, declined. Supports $filter (eq).'
        ),
      userDisplayName: z
        .string()
        .describe('Display name of the user when the acceptance was recorded.')
        .nullable(),
      userEmail: z
        .string()
        .describe('Email of the user when the acceptance was recorded.')
        .nullable(),
      userId: z
        .string()
        .describe('The identifier of the user who accepted the agreement. Supports $filter (eq).')
        .nullable(),
      userPrincipalName: z
        .string()
        .describe('UPN of the user when the acceptance was recorded.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_authenticationMethod = microsoft_graph_entity.and(
  z.object({}).partial().strict()
);
const microsoft_graph_emailAuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      emailAddress: z.string().describe('The email address registered to this user.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_attestationLevel = z.enum(['attested', 'notAttested', 'unknownFutureValue']);
const microsoft_graph_fido2AuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      aaGuid: z
        .string()
        .describe(
          'Authenticator Attestation GUID, an identifier that indicates the type (e.g. make and model) of the authenticator.'
        )
        .nullable(),
      attestationCertificates: z
        .array(z.string().nullable())
        .describe('The attestation certificate(s) attached to this security key.'),
      attestationLevel: z
        .union([microsoft_graph_attestationLevel, z.object({}).partial().strict()])
        .describe(
          'The attestation level of this FIDO2 security key. Possible values are: attested, or notAttested.'
        ),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The timestamp when this key was registered to the user.')
        .nullable(),
      displayName: z
        .string()
        .describe('The display name of the key as given by the user.')
        .nullable(),
      model: z
        .string()
        .describe('The manufacturer-assigned model of the FIDO2 security key.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_alternativeSecurityId = z
  .object({
    identityProvider: z.string().describe('For internal use only.').nullable(),
    key: z.string().describe('For internal use only.').nullable(),
    type: z.number().gte(-2147483648).lte(2147483647).describe('For internal use only.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_device = microsoft_graph_directoryObject.and(
  z
    .object({
      accountEnabled: z
        .boolean()
        .describe(
          'true if the account is enabled; otherwise, false. Required. Default is true.  Supports $filter (eq, ne, not, in). Only callers with at least the Cloud Device Administrator role can set this property.'
        )
        .nullable(),
      alternativeSecurityIds: z
        .array(microsoft_graph_alternativeSecurityId)
        .describe('For internal use only. Not nullable. Supports $filter (eq, not, ge, le).'),
      approximateLastSignInDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only. Supports $filter (eq, ne, not, ge, le, and eq on null values) and $orderby.'
        )
        .nullable(),
      complianceExpirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The timestamp when the device is no longer deemed compliant. The timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      deviceCategory: z
        .string()
        .describe(
          'User-defined property set by Intune to automatically add devices to groups and simplify managing devices.'
        )
        .nullable(),
      deviceId: z
        .string()
        .describe(
          'Unique identifier set by Azure Device Registration Service at the time of registration. This alternate key can be used to reference the device object. Supports $filter (eq, ne, not, startsWith).'
        )
        .nullable(),
      deviceMetadata: z.string().describe('For internal use only. Set to null.').nullable(),
      deviceOwnership: z
        .string()
        .describe(
          'Ownership of the device. Intune sets this property. Possible values are: unknown, company, personal.'
        )
        .nullable(),
      deviceVersion: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('For internal use only.')
        .nullable(),
      displayName: z
        .string()
        .describe(
          'The display name for the device. Maximum length is 256 characters. Required. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values), $search, and $orderby.'
        )
        .nullable(),
      enrollmentProfileName: z
        .string()
        .describe(
          'Enrollment profile applied to the device. For example, Apple Device Enrollment Profile, Device enrollment - Corporate device identifiers, or Windows Autopilot profile name. This property is set by Intune.'
        )
        .nullable(),
      enrollmentType: z
        .string()
        .describe(
          'Enrollment type of the device. Intune sets this property. Possible values are: unknown, userEnrollment, deviceEnrollmentManager, appleBulkWithUser, appleBulkWithoutUser, windowsAzureADJoin, windowsBulkUserless, windowsAutoEnrollment, windowsBulkAzureDomainJoin, windowsCoManagement, windowsAzureADJoinUsingDeviceAuth,appleUserEnrollment, appleUserEnrollmentWithServiceAccount. NOTE: This property might return other values apart from those listed.'
        )
        .nullable(),
      isCompliant: z
        .boolean()
        .describe(
          'true if the device complies with Mobile Device Management (MDM) policies; otherwise, false. Read-only. This can only be updated by Intune for any device OS type or by an approved MDM app for Windows OS devices. Supports $filter (eq, ne, not).'
        )
        .nullable(),
      isManaged: z
        .boolean()
        .describe(
          'true if the device is managed by a Mobile Device Management (MDM) app; otherwise, false. This can only be updated by Intune for any device OS type or by an approved MDM app for Windows OS devices. Supports $filter (eq, ne, not).'
        )
        .nullable(),
      isManagementRestricted: z.boolean().nullable(),
      isRooted: z
        .boolean()
        .describe(
          'true if the device is rooted or jail-broken. This property can only be updated by Intune.'
        )
        .nullable(),
      managementType: z
        .string()
        .describe(
          'The management channel of the device. This property is set by Intune. Possible values are: eas, mdm, easMdm, intuneClient, easIntuneClient, configurationManagerClient, configurationManagerClientMdm, configurationManagerClientMdmEas, unknown, jamf, googleCloudDevicePolicyController.'
        )
        .nullable(),
      manufacturer: z.string().describe('Manufacturer of the device. Read-only.').nullable(),
      mdmAppId: z
        .string()
        .describe(
          'Application identifier used to register device into MDM. Read-only. Supports $filter (eq, ne, not, startsWith).'
        )
        .nullable(),
      model: z.string().describe('Model of the device. Read-only.').nullable(),
      onPremisesLastSyncDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The last time at which the object was synced with the on-premises directory. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z Read-only. Supports $filter (eq, ne, not, ge, le, in).'
        )
        .nullable(),
      onPremisesSecurityIdentifier: z
        .string()
        .describe(
          'The on-premises security identifier (SID) for the user who was synchronized from on-premises to the cloud. Read-only. Returned only on $select. Supports $filter (eq).'
        )
        .nullable(),
      onPremisesSyncEnabled: z
        .boolean()
        .describe(
          'true if this object is synced from an on-premises directory; false if this object was originally synced from an on-premises directory but is no longer synced; null if this object has never been synced from an on-premises directory (default). Read-only. Supports $filter (eq, ne, not, in, and eq on null values).'
        )
        .nullable(),
      operatingSystem: z
        .string()
        .describe(
          'The type of operating system on the device. Required. Supports $filter (eq, ne, not, ge, le, startsWith, and eq on null values).'
        )
        .nullable(),
      operatingSystemVersion: z
        .string()
        .describe(
          'The version of the operating system on the device. Required. Supports $filter (eq, ne, not, ge, le, startsWith, and eq on null values).'
        )
        .nullable(),
      physicalIds: z
        .array(z.string())
        .describe(
          'For internal use only. Not nullable. Supports $filter (eq, not, ge, le, startsWith,/$count eq 0, /$count ne 0).'
        ),
      profileType: z
        .string()
        .describe(
          'The profile type of the device. Possible values: RegisteredDevice (default), SecureVM, Printer, Shared, IoT.'
        )
        .nullable(),
      registrationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time of when the device was registered. The timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      systemLabels: z
        .array(z.string())
        .describe(
          'List of labels applied to the device by the system. Supports $filter (/$count eq 0, /$count ne 0).'
        ),
      trustType: z
        .string()
        .describe(
          'Type of trust for the joined device. Read-only. Possible values:  Workplace (indicates bring your own personal devices), AzureAd (Cloud-only joined devices), ServerAd (on-premises domain joined devices joined to Microsoft Entra ID). For more information, see Introduction to device management in Microsoft Entra ID. Supports $filter (eq, ne, not, in).'
        )
        .nullable(),
      extensions: z
        .array(microsoft_graph_extension)
        .describe('The collection of open extensions defined for the device. Read-only. Nullable.'),
      memberOf: z
        .array(microsoft_graph_directoryObject)
        .describe(
          'Groups and administrative units that this device is a member of. Read-only. Nullable. Supports $expand.'
        ),
      registeredOwners: z
        .array(microsoft_graph_directoryObject)
        .describe(
          'The user that cloud joined the device or registered their personal device. The registered owner is set at the time of registration. Read-only. Nullable. Supports $expand.'
        ),
      registeredUsers: z
        .array(microsoft_graph_directoryObject)
        .describe(
          'Collection of registered users of the device. For cloud joined devices and registered personal devices, registered users are set to the same value as registered owners at the time of registration. Read-only. Nullable. Supports $expand.'
        ),
      transitiveMemberOf: z
        .array(microsoft_graph_directoryObject)
        .describe(
          'Groups and administrative units that the device is a member of. This operation is transitive. Supports $expand.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_microsoftAuthenticatorAuthenticationMethod =
  microsoft_graph_authenticationMethod.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "The date and time that this app was registered. This property is null if the device isn't registered for passwordless Phone Sign-In."
          )
          .nullable(),
        deviceTag: z.string().describe('Tags containing app metadata.').nullable(),
        displayName: z
          .string()
          .describe('The name of the device on which this app is registered.')
          .nullable(),
        phoneAppVersion: z
          .string()
          .describe('Numerical version of this instance of the Authenticator app.')
          .nullable(),
        device: z
          .union([microsoft_graph_device, z.object({}).partial().strict()])
          .describe(
            "The registered device on which Microsoft Authenticator resides. This property is null if the device isn't registered for passwordless Phone Sign-In."
          ),
      })
      .partial()
      .strict()
  );
const microsoft_graph_passwordAuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when this password was last updated. This property is currently not populated. Read-only. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      password: z
        .string()
        .describe(
          'For security, the password is always returned as null from a LIST or GET operation.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_authenticationPhoneType = z.enum([
  'mobile',
  'alternateMobile',
  'office',
  'unknownFutureValue',
]);
const microsoft_graph_authenticationMethodSignInState = z.enum([
  'notSupported',
  'notAllowedByPolicy',
  'notEnabled',
  'phoneNumberNotUnique',
  'ready',
  'notConfigured',
  'unknownFutureValue',
]);
const microsoft_graph_phoneAuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      phoneNumber: z
        .string()
        .describe(
          "The phone number to text or call for authentication. Phone numbers use the format +{country code} {number}x{extension}, with extension optional. For example, +1 5555551234 or +1 5555551234x123 are valid. Numbers are rejected when creating or updating if they don't match the required format."
        )
        .nullable(),
      phoneType: z
        .union([microsoft_graph_authenticationPhoneType, z.object({}).partial().strict()])
        .describe(
          'The type of this phone. Possible values are: mobile, alternateMobile, or office.'
        ),
      smsSignInState: z
        .union([microsoft_graph_authenticationMethodSignInState, z.object({}).partial().strict()])
        .describe(
          'Whether a phone is ready to be used for SMS sign-in or not. Possible values are: notSupported, notAllowedByPolicy, notEnabled, phoneNumberNotUnique, ready, or notConfigured, unknownFutureValue.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_authenticationMethodKeyStrength = z.enum(['normal', 'weak', 'unknown']);
const microsoft_graph_authenticationMethodPlatform = z.enum([
  'unknown',
  'windows',
  'macOS',
  'iOS',
  'android',
  'linux',
  'unknownFutureValue',
]);
const microsoft_graph_platformCredentialAuthenticationMethod =
  microsoft_graph_authenticationMethod.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('The date and time that this Platform Credential Key was registered.')
          .nullable(),
        displayName: z
          .string()
          .describe('The name of the device on which Platform Credential is registered.')
          .nullable(),
        keyStrength: z
          .union([microsoft_graph_authenticationMethodKeyStrength, z.object({}).partial().strict()])
          .describe(
            'Key strength of this Platform Credential key. Possible values are: normal, weak, unknown.'
          ),
        platform: z
          .union([microsoft_graph_authenticationMethodPlatform, z.object({}).partial().strict()])
          .describe(
            'Platform on which this Platform Credential key is present. Possible values are: unknown, windows, macOS,iOS, android, linux.'
          ),
        device: z
          .union([microsoft_graph_device, z.object({}).partial().strict()])
          .describe(
            "The registered device on which this Platform Credential resides. Supports $expand. When you get a user's Platform Credential registration information, this property is returned only on a single GET and when you specify ?$expand. For example, GET /users/admin@contoso.com/authentication/platformCredentialAuthenticationMethod/_jpuR-TGZtk6aQCLF3BQjA2?$expand=device."
          ),
      })
      .partial()
      .strict()
  );
const microsoft_graph_softwareOathAuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      secretKey: z
        .string()
        .describe('The secret key of the method. Always returns null.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_temporaryAccessPassAuthenticationMethod =
  microsoft_graph_authenticationMethod.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('The date and time when the Temporary Access Pass was created.')
          .nullable(),
        isUsable: z
          .boolean()
          .describe(
            "The state of the authentication method that indicates whether it's currently usable by the user."
          )
          .nullable(),
        isUsableOnce: z
          .boolean()
          .describe(
            'Determines whether the pass is limited to a one-time use. If true, the pass can be used once; if false, the pass can be used multiple times within the Temporary Access Pass lifetime.'
          )
          .nullable(),
        lifetimeInMinutes: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe(
            'The lifetime of the Temporary Access Pass in minutes starting at startDateTime. Must be between 10 and 43200 inclusive (equivalent to 30 days).'
          )
          .nullable(),
        methodUsabilityReason: z
          .string()
          .describe(
            'Details about the usability state (isUsable). Reasons can include: EnabledByPolicy, DisabledByPolicy, Expired, NotYetValid, OneTimeUsed.'
          )
          .nullable(),
        startDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The date and time when the Temporary Access Pass becomes available to use and when isUsable is true is enforced.'
          )
          .nullable(),
        temporaryAccessPass: z
          .string()
          .describe(
            'The Temporary Access Pass used to authenticate. Returned only on creation of a new temporaryAccessPassAuthenticationMethod object; Hidden in subsequent read operations and returned as null with GET.'
          )
          .nullable(),
      })
      .partial()
      .strict()
  );
const microsoft_graph_windowsHelloForBusinessAuthenticationMethod =
  microsoft_graph_authenticationMethod.and(
    z
      .object({
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('The date and time that this Windows Hello for Business key was registered.')
          .nullable(),
        displayName: z
          .string()
          .describe('The name of the device on which Windows Hello for Business is registered')
          .nullable(),
        keyStrength: z
          .union([microsoft_graph_authenticationMethodKeyStrength, z.object({}).partial().strict()])
          .describe(
            'Key strength of this Windows Hello for Business key. Possible values are: normal, weak, unknown.'
          ),
        device: z
          .union([microsoft_graph_device, z.object({}).partial().strict()])
          .describe(
            "The registered device on which this Windows Hello for Business key resides. Supports $expand. When you get a user's Windows Hello for Business registration information, this property is returned only on a single GET and when you specify ?$expand. For example, GET /users/admin@contoso.com/authentication/windowsHelloForBusinessMethods/_jpuR-TGZtk6aQCLF3BQjA2?$expand=device."
          ),
      })
      .partial()
      .strict()
  );
const microsoft_graph_authentication = microsoft_graph_entity.and(
  z
    .object({
      emailMethods: z
        .array(microsoft_graph_emailAuthenticationMethod)
        .describe('The email address registered to a user for authentication.'),
      fido2Methods: z
        .array(microsoft_graph_fido2AuthenticationMethod)
        .describe('Represents the FIDO2 security keys registered to a user for authentication.'),
      methods: z
        .array(microsoft_graph_authenticationMethod)
        .describe('Represents all authentication methods registered to a user.'),
      microsoftAuthenticatorMethods: z
        .array(microsoft_graph_microsoftAuthenticatorAuthenticationMethod)
        .describe(
          'The details of the Microsoft Authenticator app registered to a user for authentication.'
        ),
      operations: z
        .array(microsoft_graph_longRunningOperation)
        .describe(
          'Represents the status of a long-running operation, such as a password reset operation.'
        ),
      passwordMethods: z
        .array(microsoft_graph_passwordAuthenticationMethod)
        .describe(
          'Represents the password registered to a user for authentication. For security, the password itself is never returned in the object, but action can be taken to reset a password.'
        ),
      phoneMethods: z
        .array(microsoft_graph_phoneAuthenticationMethod)
        .describe('The phone numbers registered to a user for authentication.'),
      platformCredentialMethods: z
        .array(microsoft_graph_platformCredentialAuthenticationMethod)
        .describe('Represents a platform credential instance registered to a user on Mac OS.'),
      softwareOathMethods: z
        .array(microsoft_graph_softwareOathAuthenticationMethod)
        .describe(
          'The software OATH time-based one-time password (TOTP) applications registered to a user for authentication.'
        ),
      temporaryAccessPassMethods: z
        .array(microsoft_graph_temporaryAccessPassAuthenticationMethod)
        .describe(
          'Represents a Temporary Access Pass registered to a user for authentication through time-limited passcodes.'
        ),
      windowsHelloForBusinessMethods: z
        .array(microsoft_graph_windowsHelloForBusinessAuthenticationMethod)
        .describe(
          'Represents the Windows Hello for Business authentication method registered to a user for authentication.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_calendarGroup = microsoft_graph_entity.and(
  z
    .object({
      changeKey: z
        .string()
        .describe(
          'Identifies the version of the calendar group. Every time the calendar group is changed, ChangeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
        )
        .nullable(),
      classId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .describe('The class identifier. Read-only.')
        .nullable(),
      name: z.string().describe('The group name.').nullable(),
      calendars: z
        .array(microsoft_graph_calendar)
        .describe('The calendars in the calendar group. Navigation property. Read-only. Nullable.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_chatType = z.enum(['oneOnOne', 'group', 'meeting', 'unknownFutureValue']);
const microsoft_graph_teamworkUserIdentityType = z.enum([
  'aadUser',
  'onPremiseAadUser',
  'anonymousGuest',
  'federatedUser',
  'personalMicrosoftAccountUser',
  'skypeUser',
  'phoneUser',
  'unknownFutureValue',
  'emailUser',
]);
const microsoft_graph_teamworkUserIdentity = microsoft_graph_identity.and(
  z
    .object({
      userIdentityType: z
        .union([microsoft_graph_teamworkUserIdentityType, z.object({}).partial().strict()])
        .describe(
          'Type of user. Possible values are: aadUser, onPremiseAadUser, anonymousGuest, federatedUser, personalMicrosoftAccountUser, skypeUser, phoneUser, unknownFutureValue and emailUser.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_teamworkOnlineMeetingInfo = z
  .object({
    calendarEventId: z
      .string()
      .describe('The identifier of the calendar event associated with the meeting.')
      .nullable(),
    joinWebUrl: z
      .string()
      .describe('The URL that users click to join or uniquely identify the meeting.')
      .nullable(),
    organizer: z
      .union([microsoft_graph_teamworkUserIdentity, z.object({}).partial().strict()])
      .describe('The organizer of the meeting.'),
  })
  .partial()
  .strict();
const microsoft_graph_chatViewpoint = z
  .object({
    isHidden: z
      .boolean()
      .describe('Indicates whether the chat is hidden for the current user.')
      .nullable(),
    lastMessageReadDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Represents the dateTime up until which the current user has read chatMessages in a specific chat.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_chatMessageInfo = microsoft_graph_entity.and(
  z
    .object({
      body: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe(
          "Body of the chatMessage. This will still contain markers for @mentions and attachments even though the object doesn't return @mentions and attachments."
        ),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date time object representing the time at which message was created.')
        .nullable(),
      eventDetail: z
        .union([microsoft_graph_eventMessageDetail, z.object({}).partial().strict()])
        .describe(
          'Read-only.  If present, represents details of an event that happened in a chat, a channel, or a team, for example, members were added, and so on. For event messages, the messageType property is set to systemEventMessage.'
        ),
      from: z
        .union([microsoft_graph_chatMessageFromIdentitySet, z.object({}).partial().strict()])
        .describe('Information about the sender of the message.'),
      isDeleted: z
        .boolean()
        .describe('If set to true, the original message has been deleted.')
        .nullable(),
      messageType: microsoft_graph_chatMessageType,
    })
    .partial()
    .strict()
);
const microsoft_graph_pinnedChatMessageInfo = microsoft_graph_entity.and(
  z
    .object({
      message: z
        .union([microsoft_graph_chatMessage, z.object({}).partial().strict()])
        .describe('Represents details about the chat message that is pinned.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_chat = microsoft_graph_entity.and(
  z
    .object({
      chatType: microsoft_graph_chatType,
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time at which the chat was created. Read-only.')
        .nullable(),
      isHiddenForAllMembers: z
        .boolean()
        .describe('Indicates whether the chat is hidden for all its members. Read-only.')
        .nullable(),
      lastUpdatedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time at which the chat was renamed or the list of members was last changed. Read-only.'
        )
        .nullable(),
      onlineMeetingInfo: z
        .union([microsoft_graph_teamworkOnlineMeetingInfo, z.object({}).partial().strict()])
        .describe(
          "Represents details about an online meeting. If the chat isn't associated with an online meeting, the property is empty. Read-only."
        ),
      tenantId: z
        .string()
        .describe('The identifier of the tenant in which the chat was created. Read-only.')
        .nullable(),
      topic: z
        .string()
        .describe('(Optional) Subject or topic for the chat. Only available for group chats.')
        .nullable(),
      viewpoint: z
        .union([microsoft_graph_chatViewpoint, z.object({}).partial().strict()])
        .describe(
          'Represents caller-specific information about the chat, such as the last message read date and time. This property is populated only when the request is made in a delegated context.'
        ),
      webUrl: z
        .string()
        .describe(
          'The URL for the chat in Microsoft Teams. The URL should be treated as an opaque blob, and not parsed. Read-only.'
        )
        .nullable(),
      installedApps: z
        .array(microsoft_graph_teamsAppInstallation)
        .describe('A collection of all the apps in the chat. Nullable.'),
      lastMessagePreview: z
        .union([microsoft_graph_chatMessageInfo, z.object({}).partial().strict()])
        .describe(
          'Preview of the last message sent in the chat. Null if no messages were sent in the chat. Currently, only the list chats operation supports this property.'
        ),
      members: z
        .array(microsoft_graph_conversationMember)
        .describe('A collection of all the members in the chat. Nullable.'),
      messages: z
        .array(microsoft_graph_chatMessage)
        .describe('A collection of all the messages in the chat. Nullable.'),
      permissionGrants: z
        .array(microsoft_graph_resourceSpecificPermissionGrant)
        .describe('A collection of permissions granted to apps for the chat.'),
      pinnedMessages: z
        .array(microsoft_graph_pinnedChatMessageInfo)
        .describe('A collection of all the pinned messages in the chat. Nullable.'),
      tabs: z
        .array(microsoft_graph_teamsTab)
        .describe('A collection of all the tabs in the chat. Nullable.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_cloudClipboardItemPayload = z
  .object({
    content: z
      .string()
      .describe('The formatName version of the value of a cloud clipboard encoded in base64.'),
    formatName: z.string().describe('For a list of possible values see formatName values.'),
  })
  .partial()
  .strict();
const microsoft_graph_cloudClipboardItem = microsoft_graph_entity.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Set by the server. DateTime in UTC when the object was created on the server.'),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Set by the server. DateTime in UTC when the object expires and after that the object is no longer available. The default and also maximum TTL is 12 hours after the creation, but it might change for performance optimization.'
        ),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "Set by the server if not provided in the client's request. DateTime in UTC when the object was modified by the client."
        )
        .nullable(),
      payloads: z
        .array(microsoft_graph_cloudClipboardItemPayload)
        .describe(
          'A cloudClipboardItem can have multiple cloudClipboardItemPayload objects in the payloads. A window can place more than one clipboard object on the clipboard. Each one represents the same information in a different clipboard format.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_cloudClipboardRoot = microsoft_graph_entity.and(
  z
    .object({
      items: z
        .array(microsoft_graph_cloudClipboardItem)
        .describe('Represents a collection of Cloud Clipboard items.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_contact = microsoft_graph_outlookItem.and(
  z
    .object({
      assistantName: z.string().describe("The name of the contact's assistant.").nullable(),
      birthday: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "The contact's birthday. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
        )
        .nullable(),
      businessAddress: z
        .union([microsoft_graph_physicalAddress, z.object({}).partial().strict()])
        .describe("The contact's business address."),
      businessHomePage: z.string().describe('The business home page of the contact.').nullable(),
      businessPhones: z
        .array(z.string().nullable())
        .describe("The contact's business phone numbers."),
      children: z.array(z.string().nullable()).describe("The names of the contact's children."),
      companyName: z.string().describe("The name of the contact's company.").nullable(),
      department: z.string().describe("The contact's department.").nullable(),
      displayName: z
        .string()
        .describe(
          "The contact's display name. You can specify the display name in a create or update operation. Note that later updates to other properties may cause an automatically generated value to overwrite the displayName value you have specified. To preserve a pre-existing value, always include it as displayName in an update operation."
        )
        .nullable(),
      emailAddresses: z
        .array(microsoft_graph_emailAddress)
        .describe("The contact's email addresses."),
      fileAs: z.string().describe('The name the contact is filed under.').nullable(),
      generation: z.string().describe("The contact's suffix.").nullable(),
      givenName: z.string().describe("The contact's given name.").nullable(),
      homeAddress: z
        .union([microsoft_graph_physicalAddress, z.object({}).partial().strict()])
        .describe("The contact's home address."),
      homePhones: z.array(z.string().nullable()).describe("The contact's home phone numbers."),
      imAddresses: z
        .array(z.string().nullable())
        .describe("The contact's instant messaging (IM) addresses."),
      initials: z.string().describe("The contact's initials.").nullable(),
      jobTitle: z.string().describe('The contact’s job title.').nullable(),
      manager: z.string().describe("The name of the contact's manager.").nullable(),
      middleName: z.string().describe("The contact's middle name.").nullable(),
      mobilePhone: z.string().describe("The contact's mobile phone number.").nullable(),
      nickName: z.string().describe("The contact's nickname.").nullable(),
      officeLocation: z.string().describe("The location of the contact's office.").nullable(),
      otherAddress: z
        .union([microsoft_graph_physicalAddress, z.object({}).partial().strict()])
        .describe('Other addresses for the contact.'),
      parentFolderId: z.string().describe("The ID of the contact's parent folder.").nullable(),
      personalNotes: z.string().describe("The user's notes about the contact.").nullable(),
      profession: z.string().describe("The contact's profession.").nullable(),
      spouseName: z.string().describe("The name of the contact's spouse/partner.").nullable(),
      surname: z.string().describe("The contact's surname.").nullable(),
      title: z.string().describe("The contact's title.").nullable(),
      yomiCompanyName: z
        .string()
        .describe('The phonetic Japanese company name of the contact.')
        .nullable(),
      yomiGivenName: z
        .string()
        .describe('The phonetic Japanese given name (first name) of the contact.')
        .nullable(),
      yomiSurname: z
        .string()
        .describe('The phonetic Japanese surname (last name)  of the contact.')
        .nullable(),
      extensions: z
        .array(microsoft_graph_extension)
        .describe(
          'The collection of open extensions defined for the contact. Read-only. Nullable.'
        ),
      multiValueExtendedProperties: z
        .array(microsoft_graph_multiValueLegacyExtendedProperty)
        .describe(
          'The collection of multi-value extended properties defined for the contact. Read-only. Nullable.'
        ),
      photo: z
        .union([microsoft_graph_profilePhoto, z.object({}).partial().strict()])
        .describe('Optional contact picture. You can get or set a photo for a contact.'),
      singleValueExtendedProperties: z
        .array(microsoft_graph_singleValueLegacyExtendedProperty)
        .describe(
          'The collection of single-value extended properties defined for the contact. Read-only. Nullable.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_contactFolder: z.ZodType<microsoft_graph_contactFolder> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        displayName: z.string().describe("The folder's display name.").nullable(),
        parentFolderId: z.string().describe("The ID of the folder's parent folder.").nullable(),
        childFolders: z
          .array(microsoft_graph_contactFolder)
          .describe(
            'The collection of child folders in the folder. Navigation property. Read-only. Nullable.'
          ),
        contacts: z
          .array(microsoft_graph_contact)
          .describe('The contacts in the folder. Navigation property. Read-only. Nullable.'),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .describe(
            'The collection of multi-value extended properties defined for the contactFolder. Read-only. Nullable.'
          ),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .describe(
            'The collection of single-value extended properties defined for the contactFolder. Read-only. Nullable.'
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_deviceManagementTroubleshootingEvent = microsoft_graph_entity.and(
  z
    .object({
      correlationId: z
        .string()
        .describe('Id used for tracing the failure in the service.')
        .nullable(),
      eventDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Time when the event occurred .'),
    })
    .partial()
    .strict()
);
const microsoft_graph_courseStatus = z.enum([
  'notStarted',
  'inProgress',
  'completed',
  'unknownFutureValue',
]);
const microsoft_graph_learningCourseActivity = microsoft_graph_entity.and(
  z
    .object({
      completedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time when the assignment was completed. Optional.')
        .nullable(),
      completionPercentage: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The percentage completion value of the course activity. Optional.')
        .nullable(),
      externalcourseActivityId: z.string().nullable(),
      learnerUserId: z
        .string()
        .describe('The user ID of the learner to whom the activity is assigned. Required.'),
      learningContentId: z
        .string()
        .describe('The ID of the learning content created in Viva Learning. Required.'),
      learningProviderId: z
        .string()
        .describe('The registration ID of the provider. Required.')
        .nullable(),
      status: z
        .union([microsoft_graph_courseStatus, z.object({}).partial().strict()])
        .describe(
          'The status of the course activity. Possible values are: notStarted, inProgress, completed. Required.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_employeeExperienceUser = microsoft_graph_entity.and(
  z
    .object({ learningCourseActivities: z.array(microsoft_graph_learningCourseActivity) })
    .partial()
    .strict()
);
const microsoft_graph_inferenceClassificationType = z.enum(['focused', 'other']);
const microsoft_graph_inferenceClassificationOverride = microsoft_graph_entity.and(
  z
    .object({
      classifyAs: z
        .union([microsoft_graph_inferenceClassificationType, z.object({}).partial().strict()])
        .describe(
          'Specifies how incoming messages from a specific sender should always be classified as. The possible values are: focused, other.'
        ),
      senderEmailAddress: z
        .union([microsoft_graph_emailAddress, z.object({}).partial().strict()])
        .describe('The email address information of the sender for whom the override is created.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_inferenceClassification = microsoft_graph_entity.and(
  z
    .object({
      overrides: z
        .array(microsoft_graph_inferenceClassificationOverride)
        .describe(
          'A set of overrides for a user to always classify messages from specific senders in certain ways: focused, or other. Read-only. Nullable.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_insightIdentity = z
  .object({
    address: z.string().describe('The email address of the user who shared the item.').nullable(),
    displayName: z
      .string()
      .describe('The display name of the user who shared the item.')
      .nullable(),
    id: z.string().describe('The ID of the user who shared the item.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_resourceReference = z
  .object({
    id: z.string().describe("The item's unique identifier.").nullable(),
    type: z
      .string()
      .describe(
        "A string value that can be used to classify the item, such as 'microsoft.graph.driveItem'"
      )
      .nullable(),
    webUrl: z.string().describe('A URL leading to the referenced item.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_sharingDetail = z
  .object({
    sharedBy: z
      .union([microsoft_graph_insightIdentity, z.object({}).partial().strict()])
      .describe('The user who shared the document.'),
    sharedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time the file was last shared. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
      )
      .nullable(),
    sharingReference: z
      .union([microsoft_graph_resourceReference, z.object({}).partial().strict()])
      .describe(
        'Reference properties of the document, such as the URL and type of the document. Read-only'
      ),
    sharingSubject: z
      .string()
      .describe('The subject with which the document was shared.')
      .nullable(),
    sharingType: z
      .string()
      .describe(
        'Determines the way the document was shared. Can be by a 1Link1, 1Attachment1, 1Group1, 1Site1.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_resourceVisualization = z
  .object({
    containerDisplayName: z
      .string()
      .describe(
        'A string describing where the item is stored. For example, the name of a SharePoint site or the user name identifying the owner of the OneDrive storing the item.'
      )
      .nullable(),
    containerType: z
      .string()
      .describe(
        'Can be used for filtering by the type of container in which the file is stored. Such as Site or OneDriveBusiness.'
      )
      .nullable(),
    containerWebUrl: z
      .string()
      .describe('A path leading to the folder in which the item is stored.')
      .nullable(),
    mediaType: z
      .string()
      .describe(
        "The item's media type. Can be used for filtering for a specific type of file based on supported IANA Media Mime Types. Not all Media Mime Types are supported."
      )
      .nullable(),
    previewImageUrl: z
      .string()
      .describe('A URL leading to the preview image for the item.')
      .nullable(),
    previewText: z.string().describe('A preview text for the item.').nullable(),
    title: z.string().describe("The item's title text.").nullable(),
    type: z
      .string()
      .describe(
        "The item's media type. Can be used for filtering for a specific file based on a specific type. See the section Type property values for supported types."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_sharedInsight = microsoft_graph_entity.and(
  z
    .object({
      lastShared: z
        .union([microsoft_graph_sharingDetail, z.object({}).partial().strict()])
        .describe('Details about the shared item. Read only.'),
      resourceReference: z
        .union([microsoft_graph_resourceReference, z.object({}).partial().strict()])
        .describe(
          'Reference properties of the shared document, such as the url and type of the document. Read-only'
        ),
      resourceVisualization: z
        .union([microsoft_graph_resourceVisualization, z.object({}).partial().strict()])
        .describe(
          'Properties that you can use to visualize the document in your experience. Read-only'
        ),
      sharingHistory: z.array(microsoft_graph_sharingDetail),
      lastSharedMethod: z.union([microsoft_graph_entity, z.object({}).partial().strict()]),
      resource: z
        .union([microsoft_graph_entity, z.object({}).partial().strict()])
        .describe(
          'Used for navigating to the item that was shared. For file attachments, the type is fileAttachment. For linked attachments, the type is driveItem.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_trending = microsoft_graph_entity.and(
  z
    .object({
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullable(),
      resourceReference: z
        .union([microsoft_graph_resourceReference, z.object({}).partial().strict()])
        .describe(
          'Reference properties of the trending document, such as the url and type of the document.'
        ),
      resourceVisualization: z
        .union([microsoft_graph_resourceVisualization, z.object({}).partial().strict()])
        .describe('Properties that you can use to visualize the document in your experience.'),
      weight: z
        .union([z.number(), z.string(), ReferenceNumeric])
        .describe(
          'Value indicating how much the document is currently trending. The larger the number, the more the document is currently trending around the user (the more relevant it is). Returned documents are sorted by this value.'
        ),
      resource: z
        .union([microsoft_graph_entity, z.object({}).partial().strict()])
        .describe('Used for navigating to the trending document.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_usageDetails = z
  .object({
    lastAccessedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time the resource was last accessed by the user. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
      )
      .nullable(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time the resource was last modified by the user. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_usedInsight = microsoft_graph_entity.and(
  z
    .object({
      lastUsed: z
        .union([microsoft_graph_usageDetails, z.object({}).partial().strict()])
        .describe(
          'Information about when the item was last viewed or modified by the user. Read only.'
        ),
      resourceReference: z
        .union([microsoft_graph_resourceReference, z.object({}).partial().strict()])
        .describe(
          'Reference properties of the used document, such as the url and type of the document. Read-only'
        ),
      resourceVisualization: z
        .union([microsoft_graph_resourceVisualization, z.object({}).partial().strict()])
        .describe(
          'Properties that you can use to visualize the document in your experience. Read-only'
        ),
      resource: z
        .union([microsoft_graph_entity, z.object({}).partial().strict()])
        .describe(
          'Used for navigating to the item that was used. For file attachments, the type is fileAttachment. For linked attachments, the type is driveItem.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_officeGraphInsights = microsoft_graph_entity.and(
  z
    .object({
      shared: z
        .array(microsoft_graph_sharedInsight)
        .describe(
          'Calculated relationship that identifies documents shared with or by the user. This includes URLs, file attachments, and reference attachments to OneDrive for work or school and SharePoint files found in Outlook messages and meetings. This also includes URLs and reference attachments to Teams conversations. Ordered by recency of share.'
        ),
      trending: z
        .array(microsoft_graph_trending)
        .describe(
          "Calculated relationship that identifies documents trending around a user. Trending documents are calculated based on activity of the user's closest network of people and include files stored in OneDrive for work or school and SharePoint. Trending insights help the user to discover potentially useful content that the user has access to, but has never viewed before."
        ),
      used: z
        .array(microsoft_graph_usedInsight)
        .describe(
          'Calculated relationship that identifies the latest documents viewed or modified by a user, including OneDrive for work or school and SharePoint documents, ranked by recency of use.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_itemInsights = microsoft_graph_officeGraphInsights.and(
  z.object({}).partial().strict()
);
const microsoft_graph_servicePlanInfo = z
  .object({
    appliesTo: z
      .string()
      .describe(
        'The object the service plan can be assigned to. The possible values are:User - service plan can be assigned to individual users.Company - service plan can be assigned to the entire tenant.'
      )
      .nullable(),
    provisioningStatus: z
      .string()
      .describe(
        "The provisioning status of the service plan. The possible values are:Success - Service is fully provisioned.Disabled - Service is disabled.Error - The service plan isn't provisioned and is in an error state.PendingInput - The service isn't provisioned and is awaiting service confirmation.PendingActivation - The service is provisioned but requires explicit activation by an administrator (for example, Intune_O365 service plan)PendingProvisioning - Microsoft has added a new service to the product SKU and it isn't activated in the tenant."
      )
      .nullable(),
    servicePlanId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .describe('The unique identifier of the service plan.')
      .nullable(),
    servicePlanName: z.string().describe('The name of the service plan.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_licenseDetails = microsoft_graph_entity.and(
  z
    .object({
      servicePlans: z
        .array(microsoft_graph_servicePlanInfo)
        .describe(
          'Information about the service plans assigned with the license. Read-only. Not nullable.'
        ),
      skuId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .describe(
          'Unique identifier (GUID) for the service SKU. Equal to the skuId property on the related subscribedSku object. Read-only.'
        )
        .nullable(),
      skuPartNumber: z
        .string()
        .describe(
          'Unique SKU display name. Equal to the skuPartNumber on the related subscribedSku object; for example, AAD_Premium. Read-only.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_messageRuleActions = z
  .object({
    assignCategories: z
      .array(z.string().nullable())
      .describe('A list of categories to be assigned to a message.'),
    copyToFolder: z
      .string()
      .describe('The ID of a folder that a message is to be copied to.')
      .nullable(),
    delete: z
      .boolean()
      .describe('Indicates whether a message should be moved to the Deleted Items folder.')
      .nullable(),
    forwardAsAttachmentTo: z
      .array(microsoft_graph_recipient)
      .describe(
        'The email addresses of the recipients to which a message should be forwarded as an attachment.'
      ),
    forwardTo: z
      .array(microsoft_graph_recipient)
      .describe('The email addresses of the recipients to which a message should be forwarded.'),
    markAsRead: z
      .boolean()
      .describe('Indicates whether a message should be marked as read.')
      .nullable(),
    markImportance: z
      .union([microsoft_graph_importance, z.object({}).partial().strict()])
      .describe('Sets the importance of the message, which can be: low, normal, high.'),
    moveToFolder: z
      .string()
      .describe('The ID of the folder that a message will be moved to.')
      .nullable(),
    permanentDelete: z
      .boolean()
      .describe(
        'Indicates whether a message should be permanently deleted and not saved to the Deleted Items folder.'
      )
      .nullable(),
    redirectTo: z
      .array(microsoft_graph_recipient)
      .describe('The email addresses to which a message should be redirected.'),
    stopProcessingRules: z
      .boolean()
      .describe('Indicates whether subsequent rules should be evaluated.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_messageActionFlag = z.enum([
  'any',
  'call',
  'doNotForward',
  'followUp',
  'fyi',
  'forward',
  'noResponseNecessary',
  'read',
  'reply',
  'replyToAll',
  'review',
]);
const microsoft_graph_sizeRange = z
  .object({
    maximumSize: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The maximum size (in kilobytes) that an incoming message must have in order for a condition or exception to apply.'
      )
      .nullable(),
    minimumSize: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The minimum size (in kilobytes) that an incoming message must have in order for a condition or exception to apply.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_messageRulePredicates = z
  .object({
    bodyContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that should appear in the body of an incoming message in order for the condition or exception to apply.'
      ),
    bodyOrSubjectContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that should appear in the body or subject of an incoming message in order for the condition or exception to apply.'
      ),
    categories: z
      .array(z.string().nullable())
      .describe(
        'Represents the categories that an incoming message should be labeled with in order for the condition or exception to apply.'
      ),
    fromAddresses: z
      .array(microsoft_graph_recipient)
      .describe(
        'Represents the specific sender email addresses of an incoming message in order for the condition or exception to apply.'
      ),
    hasAttachments: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must have attachments in order for the condition or exception to apply.'
      )
      .nullable(),
    headerContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that appear in the headers of an incoming message in order for the condition or exception to apply.'
      ),
    importance: z
      .union([microsoft_graph_importance, z.object({}).partial().strict()])
      .describe(
        'The importance that is stamped on an incoming message in order for the condition or exception to apply: low, normal, high.'
      ),
    isApprovalRequest: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be an approval request in order for the condition or exception to apply.'
      )
      .nullable(),
    isAutomaticForward: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be automatically forwarded in order for the condition or exception to apply.'
      )
      .nullable(),
    isAutomaticReply: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be an auto reply in order for the condition or exception to apply.'
      )
      .nullable(),
    isEncrypted: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be encrypted in order for the condition or exception to apply.'
      )
      .nullable(),
    isMeetingRequest: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a meeting request in order for the condition or exception to apply.'
      )
      .nullable(),
    isMeetingResponse: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a meeting response in order for the condition or exception to apply.'
      )
      .nullable(),
    isNonDeliveryReport: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a non-delivery report in order for the condition or exception to apply.'
      )
      .nullable(),
    isPermissionControlled: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be permission controlled (RMS-protected) in order for the condition or exception to apply.'
      )
      .nullable(),
    isReadReceipt: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a read receipt in order for the condition or exception to apply.'
      )
      .nullable(),
    isSigned: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be S/MIME-signed in order for the condition or exception to apply.'
      )
      .nullable(),
    isVoicemail: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a voice mail in order for the condition or exception to apply.'
      )
      .nullable(),
    messageActionFlag: z
      .union([microsoft_graph_messageActionFlag, z.object({}).partial().strict()])
      .describe(
        'Represents the flag-for-action value that appears on an incoming message in order for the condition or exception to apply. The possible values are: any, call, doNotForward, followUp, fyi, forward, noResponseNecessary, read, reply, replyToAll, review.'
      ),
    notSentToMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must not be a recipient of an incoming message in order for the condition or exception to apply.'
      )
      .nullable(),
    recipientContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that appear in either the toRecipients or ccRecipients properties of an incoming message in order for the condition or exception to apply.'
      ),
    senderContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that appear in the from property of an incoming message in order for the condition or exception to apply.'
      ),
    sensitivity: z
      .union([microsoft_graph_sensitivity, z.object({}).partial().strict()])
      .describe(
        'Represents the sensitivity level that must be stamped on an incoming message in order for the condition or exception to apply. The possible values are: normal, personal, private, confidential.'
      ),
    sentCcMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must be in the ccRecipients property of an incoming message in order for the condition or exception to apply.'
      )
      .nullable(),
    sentOnlyToMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must be the only recipient in an incoming message in order for the condition or exception to apply.'
      )
      .nullable(),
    sentToAddresses: z
      .array(microsoft_graph_recipient)
      .describe(
        'Represents the email addresses that an incoming message must have been sent to in order for the condition or exception to apply.'
      ),
    sentToMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must be in the toRecipients property of an incoming message in order for the condition or exception to apply.'
      )
      .nullable(),
    sentToOrCcMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must be in either a toRecipients or ccRecipients property of an incoming message in order for the condition or exception to apply.'
      )
      .nullable(),
    subjectContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that appear in the subject of an incoming message in order for the condition or exception to apply.'
      ),
    withinSizeRange: z
      .union([microsoft_graph_sizeRange, z.object({}).partial().strict()])
      .describe(
        'Represents the minimum and maximum sizes (in kilobytes) that an incoming message must fall in between in order for the condition or exception to apply.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_messageRule = microsoft_graph_entity.and(
  z
    .object({
      actions: z
        .union([microsoft_graph_messageRuleActions, z.object({}).partial().strict()])
        .describe(
          'Actions to be taken on a message when the corresponding conditions are fulfilled.'
        ),
      conditions: z
        .union([microsoft_graph_messageRulePredicates, z.object({}).partial().strict()])
        .describe(
          'Conditions that when fulfilled trigger the corresponding actions for that rule.'
        ),
      displayName: z.string().describe('The display name of the rule.').nullable(),
      exceptions: z
        .union([microsoft_graph_messageRulePredicates, z.object({}).partial().strict()])
        .describe('Exception conditions for the rule.'),
      hasError: z
        .boolean()
        .describe('Indicates whether the rule is in an error condition. Read-only.')
        .nullable(),
      isEnabled: z
        .boolean()
        .describe('Indicates whether the rule is enabled to be applied to messages.')
        .nullable(),
      isReadOnly: z
        .boolean()
        .describe(
          'Indicates if the rule is read-only and cannot be modified or deleted by the rules REST API.'
        )
        .nullable(),
      sequence: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Indicates the order in which the rule is executed, among other rules.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_followupFlagStatus = z.enum(['notFlagged', 'complete', 'flagged']);
const microsoft_graph_followupFlag = z
  .object({
    completedDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
      .describe('The date and time that the follow-up was finished.'),
    dueDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
      .describe(
        'The date and time that the follow-up is to be finished. Note: To set the due date, you must also specify the startDateTime; otherwise, you get a 400 Bad Request response.'
      ),
    flagStatus: z
      .union([microsoft_graph_followupFlagStatus, z.object({}).partial().strict()])
      .describe(
        'The status for follow-up for an item. Possible values are notFlagged, complete, and flagged.'
      ),
    startDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
      .describe('The date and time that the follow-up is to begin.'),
  })
  .partial()
  .strict();
const microsoft_graph_internetMessageHeader = z
  .object({
    name: z.string().describe('Represents the key in a key-value pair.').nullable(),
    value: z.string().describe('The value in a key-value pair.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_message = microsoft_graph_outlookItem.and(
  z
    .object({
      bccRecipients: z
        .array(microsoft_graph_recipient)
        .describe('The Bcc: recipients for the message.'),
      body: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe(
          'The body of the message. It can be in HTML or text format. Find out about safe HTML in a message body.'
        ),
      bodyPreview: z
        .string()
        .describe('The first 255 characters of the message body. It is in text format.')
        .nullable(),
      ccRecipients: z
        .array(microsoft_graph_recipient)
        .describe('The Cc: recipients for the message.'),
      conversationId: z
        .string()
        .describe('The ID of the conversation the email belongs to.')
        .nullable(),
      conversationIndex: z
        .string()
        .describe('Indicates the position of the message within the conversation.')
        .nullable(),
      flag: z
        .union([microsoft_graph_followupFlag, z.object({}).partial().strict()])
        .describe(
          'Indicates the status, start date, due date, or completion date for the message.'
        ),
      from: z
        .union([microsoft_graph_recipient, z.object({}).partial().strict()])
        .describe(
          'The owner of the mailbox from which the message is sent. In most cases, this value is the same as the sender property, except for sharing or delegation scenarios. The value must correspond to the actual mailbox used. Find out more about setting the from and sender properties of a message.'
        ),
      hasAttachments: z
        .boolean()
        .describe(
          "Indicates whether the message has attachments. This property doesn't include inline attachments, so if a message contains only inline attachments, this property is false. To verify the existence of inline attachments, parse the body property to look for a src attribute, such as <IMG src='cid:image001.jpg@01D26CD8.6C05F070'>."
        )
        .nullable(),
      importance: z
        .union([microsoft_graph_importance, z.object({}).partial().strict()])
        .describe('The importance of the message. The possible values are: low, normal, and high.'),
      inferenceClassification: z
        .union([microsoft_graph_inferenceClassificationType, z.object({}).partial().strict()])
        .describe(
          'The classification of the message for the user, based on inferred relevance or importance, or on an explicit override. The possible values are: focused or other.'
        ),
      internetMessageHeaders: z
        .array(microsoft_graph_internetMessageHeader)
        .describe(
          'A collection of message headers defined by RFC5322. The set includes message headers indicating the network path taken by a message from the sender to the recipient. It can also contain custom message headers that hold app data for the message.  Returned only on applying a $select query option. Read-only.'
        ),
      internetMessageId: z
        .string()
        .describe('The message ID in the format specified by RFC2822.')
        .nullable(),
      isDeliveryReceiptRequested: z
        .boolean()
        .describe('Indicates whether a read receipt is requested for the message.')
        .nullable(),
      isDraft: z
        .boolean()
        .describe(
          "Indicates whether the message is a draft. A message is a draft if it hasn't been sent yet."
        )
        .nullable(),
      isRead: z.boolean().describe('Indicates whether the message has been read.').nullable(),
      isReadReceiptRequested: z
        .boolean()
        .describe('Indicates whether a read receipt is requested for the message.')
        .nullable(),
      parentFolderId: z
        .string()
        .describe("The unique identifier for the message's parent mailFolder.")
        .nullable(),
      receivedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time the message was received.  The date and time information uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      replyTo: z
        .array(microsoft_graph_recipient)
        .describe('The email addresses to use when replying.'),
      sender: z
        .union([microsoft_graph_recipient, z.object({}).partial().strict()])
        .describe(
          'The account that is used to generate the message. In most cases, this value is the same as the from property. You can set this property to a different value when sending a message from a shared mailbox, for a shared calendar, or as a delegate. In any case, the value must correspond to the actual mailbox used. Find out more about setting the from and sender properties of a message.'
        ),
      sentDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time the message was sent.  The date and time information uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      subject: z.string().describe('The subject of the message.').nullable(),
      toRecipients: z
        .array(microsoft_graph_recipient)
        .describe('The To: recipients for the message.'),
      uniqueBody: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe(
          'The part of the body of the message that is unique to the current message. uniqueBody is not returned by default but can be retrieved for a given message by use of the ?$select=uniqueBody query. It can be in HTML or text format.'
        ),
      webLink: z
        .string()
        .describe(
          'The URL to open the message in Outlook on the web.You can append an ispopout argument to the end of the URL to change how the message is displayed. If ispopout is not present or if it is set to 1, then the message is shown in a popout window. If ispopout is set to 0, the browser shows the message in the Outlook on the web review pane.The message opens in the browser if you are signed in to your mailbox via Outlook on the web. You are prompted to sign in if you are not already signed in with the browser.This URL cannot be accessed from within an iFrame.'
        )
        .nullable(),
      attachments: z
        .array(microsoft_graph_attachment)
        .describe('The fileAttachment and itemAttachment attachments for the message.'),
      extensions: z
        .array(microsoft_graph_extension)
        .describe('The collection of open extensions defined for the message. Nullable.'),
      multiValueExtendedProperties: z
        .array(microsoft_graph_multiValueLegacyExtendedProperty)
        .describe(
          'The collection of multi-value extended properties defined for the message. Nullable.'
        ),
      singleValueExtendedProperties: z
        .array(microsoft_graph_singleValueLegacyExtendedProperty)
        .describe(
          'The collection of single-value extended properties defined for the message. Nullable.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_mailFolder: z.ZodType<microsoft_graph_mailFolder> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        childFolderCount: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe('The number of immediate child mailFolders in the current mailFolder.')
          .nullable(),
        displayName: z.string().describe("The mailFolder's display name.").nullable(),
        isHidden: z
          .boolean()
          .describe(
            'Indicates whether the mailFolder is hidden. This property can be set only when creating the folder. Find more information in Hidden mail folders.'
          )
          .nullable(),
        parentFolderId: z
          .string()
          .describe("The unique identifier for the mailFolder's parent mailFolder.")
          .nullable(),
        totalItemCount: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe('The number of items in the mailFolder.')
          .nullable(),
        unreadItemCount: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe('The number of items in the mailFolder marked as unread.')
          .nullable(),
        childFolders: z
          .array(microsoft_graph_mailFolder)
          .describe('The collection of child folders in the mailFolder.'),
        messageRules: z
          .array(microsoft_graph_messageRule)
          .describe("The collection of rules that apply to the user's Inbox folder."),
        messages: z
          .array(microsoft_graph_message)
          .describe('The collection of messages in the mailFolder.'),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .describe(
            'The collection of multi-value extended properties defined for the mailFolder. Read-only. Nullable.'
          ),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .describe(
            'The collection of single-value extended properties defined for the mailFolder. Read-only. Nullable.'
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_mobileAppIdentifier = z.object({}).partial().strict();
const microsoft_graph_managedAppFlaggedReason = z.enum(['none', 'rootedDevice']);
const microsoft_graph_managedAppPolicy = microsoft_graph_entity.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The date and time the policy was created.'),
      description: z.string().describe("The policy's description.").nullable(),
      displayName: z.string().describe('Policy display name.'),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Last time the policy was modified.'),
      version: z.string().describe('Version of the entity.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_managedAppOperation = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().describe('The operation name.').nullable(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The last time the app operation was modified.'),
      state: z.string().describe('The current state of the operation').nullable(),
      version: z.string().describe('Version of the entity.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_managedAppRegistration = microsoft_graph_entity.and(
  z
    .object({
      appIdentifier: z
        .union([microsoft_graph_mobileAppIdentifier, z.object({}).partial().strict()])
        .describe('The app package Identifier'),
      applicationVersion: z.string().describe('App version').nullable(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time of creation'),
      deviceName: z.string().describe('Host device name').nullable(),
      deviceTag: z
        .string()
        .describe(
          'App management SDK generated tag, which helps relate apps hosted on the same device. Not guaranteed to relate apps in all conditions.'
        )
        .nullable(),
      deviceType: z.string().describe('Host device type').nullable(),
      flaggedReasons: z
        .array(microsoft_graph_managedAppFlaggedReason)
        .describe(
          'Zero or more reasons an app registration is flagged. E.g. app running on rooted device'
        ),
      lastSyncDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time of last the app synced with management service.'),
      managementSdkVersion: z.string().describe('App management SDK version').nullable(),
      platformVersion: z.string().describe('Operating System version').nullable(),
      userId: z.string().describe('The user Id to who this app registration belongs.').nullable(),
      version: z.string().describe('Version of the entity.').nullable(),
      appliedPolicies: z
        .array(microsoft_graph_managedAppPolicy)
        .describe(
          'Zero or more policys already applied on the registered app when it last synchronized with managment service.'
        ),
      intendedPolicies: z
        .array(microsoft_graph_managedAppPolicy)
        .describe('Zero or more policies admin intended for the app as of now.'),
      operations: z
        .array(microsoft_graph_managedAppOperation)
        .describe('Zero or more long running operations triggered on the app registration.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_complianceState = z.enum([
  'unknown',
  'compliant',
  'noncompliant',
  'conflict',
  'error',
  'inGracePeriod',
  'configManager',
]);
const microsoft_graph_configurationManagerClientEnabledFeatures = z
  .object({
    compliancePolicy: z.boolean().describe('Whether compliance policy is managed by Intune'),
    deviceConfiguration: z.boolean().describe('Whether device configuration is managed by Intune'),
    inventory: z.boolean().describe('Whether inventory is managed by Intune'),
    modernApps: z.boolean().describe('Whether modern application is managed by Intune'),
    resourceAccess: z.boolean().describe('Whether resource access is managed by Intune'),
    windowsUpdateForBusiness: z
      .boolean()
      .describe('Whether Windows Update for Business is managed by Intune'),
  })
  .partial()
  .strict();
const microsoft_graph_actionState = z.enum([
  'none',
  'pending',
  'canceled',
  'active',
  'done',
  'failed',
  'notSupported',
]);
const microsoft_graph_deviceActionResult = z
  .object({
    actionName: z.string().describe('Action name').nullable(),
    actionState: microsoft_graph_actionState.describe('State of the action on the device'),
    lastUpdatedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Time the action state was last updated'),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Time the action was initiated'),
  })
  .partial()
  .strict();
const microsoft_graph_deviceEnrollmentType = z.enum([
  'unknown',
  'userEnrollment',
  'deviceEnrollmentManager',
  'appleBulkWithUser',
  'appleBulkWithoutUser',
  'windowsAzureADJoin',
  'windowsBulkUserless',
  'windowsAutoEnrollment',
  'windowsBulkAzureDomainJoin',
  'windowsCoManagement',
  'windowsAzureADJoinUsingDeviceAuth',
  'appleUserEnrollment',
  'appleUserEnrollmentWithServiceAccount',
]);
const microsoft_graph_deviceHealthAttestationState = z
  .object({
    attestationIdentityKey: z
      .string()
      .describe(
        'TWhen an Attestation Identity Key (AIK) is present on a device, it indicates that the device has an endorsement key (EK) certificate.'
      )
      .nullable(),
    bitLockerStatus: z.string().describe('On or Off of BitLocker Drive Encryption').nullable(),
    bootAppSecurityVersion: z
      .string()
      .describe('The security version number of the Boot Application')
      .nullable(),
    bootDebugging: z
      .string()
      .describe('When bootDebugging is enabled, the device is used in development and testing')
      .nullable(),
    bootManagerSecurityVersion: z
      .string()
      .describe('The security version number of the Boot Application')
      .nullable(),
    bootManagerVersion: z.string().describe('The version of the Boot Manager').nullable(),
    bootRevisionListInfo: z
      .string()
      .describe('The Boot Revision List that was loaded during initial boot on the attested device')
      .nullable(),
    codeIntegrity: z
      .string()
      .describe(
        'When code integrity is enabled, code execution is restricted to integrity verified code'
      )
      .nullable(),
    codeIntegrityCheckVersion: z.string().describe('The version of the Boot Manager').nullable(),
    codeIntegrityPolicy: z
      .string()
      .describe(
        'The Code Integrity policy that is controlling the security of the boot environment'
      )
      .nullable(),
    contentNamespaceUrl: z
      .string()
      .describe('The DHA report version. (Namespace version)')
      .nullable(),
    contentVersion: z.string().describe('The HealthAttestation state schema version').nullable(),
    dataExcutionPolicy: z
      .string()
      .describe(
        'DEP Policy defines a set of hardware and software technologies that perform additional checks on memory'
      )
      .nullable(),
    deviceHealthAttestationStatus: z
      .string()
      .describe('The DHA report version. (Namespace version)')
      .nullable(),
    earlyLaunchAntiMalwareDriverProtection: z
      .string()
      .describe('ELAM provides protection for the computers in your network when they start up')
      .nullable(),
    healthAttestationSupportedStatus: z
      .string()
      .describe('This attribute indicates if DHA is supported for the device')
      .nullable(),
    healthStatusMismatchInfo: z
      .string()
      .describe('This attribute appears if DHA-Service detects an integrity issue')
      .nullable(),
    issuedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The DateTime when device was evaluated or issued to MDM'),
    lastUpdateDateTime: z.string().describe('The Timestamp of the last update.').nullable(),
    operatingSystemKernelDebugging: z
      .string()
      .describe(
        'When operatingSystemKernelDebugging is enabled, the device is used in development and testing'
      )
      .nullable(),
    operatingSystemRevListInfo: z
      .string()
      .describe(
        'The Operating System Revision List that was loaded during initial boot on the attested device'
      )
      .nullable(),
    pcr0: z.string().describe('The measurement that is captured in PCR[0]').nullable(),
    pcrHashAlgorithm: z
      .string()
      .describe('Informational attribute that identifies the HASH algorithm that was used by TPM')
      .nullable(),
    resetCount: z.number().describe('The number of times a PC device has hibernated or resumed'),
    restartCount: z.number().describe('The number of times a PC device has rebooted'),
    safeMode: z
      .string()
      .describe(
        'Safe mode is a troubleshooting option for Windows that starts your computer in a limited state'
      )
      .nullable(),
    secureBoot: z
      .string()
      .describe(
        'When Secure Boot is enabled, the core components must have the correct cryptographic signatures'
      )
      .nullable(),
    secureBootConfigurationPolicyFingerPrint: z
      .string()
      .describe('Fingerprint of the Custom Secure Boot Configuration Policy')
      .nullable(),
    testSigning: z
      .string()
      .describe(
        'When test signing is allowed, the device does not enforce signature validation during boot'
      )
      .nullable(),
    tpmVersion: z
      .string()
      .describe('The security version number of the Boot Application')
      .nullable(),
    virtualSecureMode: z
      .string()
      .describe('VSM is a container that protects high value assets from a compromised kernel')
      .nullable(),
    windowsPE: z
      .string()
      .describe(
        'Operating system running with limited services that is used to prepare a computer for Windows'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_deviceRegistrationState = z.enum([
  'notRegistered',
  'registered',
  'revoked',
  'keyConflict',
  'approvalPending',
  'certificateReset',
  'notRegisteredPendingEnrollment',
  'unknown',
]);
const microsoft_graph_deviceManagementExchangeAccessState = z.enum([
  'none',
  'unknown',
  'allowed',
  'blocked',
  'quarantined',
]);
const microsoft_graph_deviceManagementExchangeAccessStateReason = z.enum([
  'none',
  'unknown',
  'exchangeGlobalRule',
  'exchangeIndividualRule',
  'exchangeDeviceRule',
  'exchangeUpgrade',
  'exchangeMailboxPolicy',
  'other',
  'compliant',
  'notCompliant',
  'notEnrolled',
  'unknownLocation',
  'mfaRequired',
  'azureADBlockDueToAccessPolicy',
  'compromisedPassword',
  'deviceNotKnownWithManagedApp',
]);
const microsoft_graph_managedDeviceOwnerType = z.enum([
  'unknown',
  'company',
  'personal',
  'unknownFutureValue',
]);
const microsoft_graph_managementAgentType = z.enum([
  'eas',
  'mdm',
  'easMdm',
  'intuneClient',
  'easIntuneClient',
  'configurationManagerClient',
  'configurationManagerClientMdm',
  'configurationManagerClientMdmEas',
  'unknown',
  'jamf',
  'googleCloudDevicePolicyController',
  'microsoft365ManagedMdm',
  'msSense',
]);
const microsoft_graph_managedDevicePartnerReportedHealthState = z.enum([
  'unknown',
  'activated',
  'deactivated',
  'secured',
  'lowSeverity',
  'mediumSeverity',
  'highSeverity',
  'unresponsive',
  'compromised',
  'misconfigured',
]);
const microsoft_graph_deviceCategory = microsoft_graph_entity.and(
  z
    .object({
      description: z.string().describe('Optional description for the device category.').nullable(),
      displayName: z.string().describe('Display name for the device category.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_policyPlatformType = z.enum([
  'android',
  'androidForWork',
  'iOS',
  'macOS',
  'windowsPhone81',
  'windows81AndLater',
  'windows10AndLater',
  'all',
]);
const microsoft_graph_settingSourceType = z.enum(['deviceConfiguration', 'deviceIntent']);
const microsoft_graph_settingSource = z
  .object({
    displayName: z.string().describe('Not yet documented').nullable(),
    id: z.string().describe('Not yet documented').nullable(),
    sourceType: microsoft_graph_settingSourceType,
  })
  .partial()
  .strict();
const microsoft_graph_complianceStatus = z.enum([
  'unknown',
  'notApplicable',
  'compliant',
  'remediated',
  'nonCompliant',
  'error',
  'conflict',
  'notAssigned',
]);
const microsoft_graph_deviceCompliancePolicySettingState = z
  .object({
    currentValue: z.string().describe('Current value of setting on device').nullable(),
    errorCode: z.number().describe('Error code for the setting'),
    errorDescription: z.string().describe('Error description').nullable(),
    instanceDisplayName: z
      .string()
      .describe('Name of setting instance that is being reported.')
      .nullable(),
    setting: z.string().describe('The setting that is being reported').nullable(),
    settingName: z
      .string()
      .describe('Localized/user friendly setting name that is being reported')
      .nullable(),
    sources: z.array(microsoft_graph_settingSource).describe('Contributing policies'),
    state: microsoft_graph_complianceStatus,
    userEmail: z.string().describe('UserEmail').nullable(),
    userId: z.string().describe('UserId').nullable(),
    userName: z.string().describe('UserName').nullable(),
    userPrincipalName: z.string().describe('UserPrincipalName.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_deviceCompliancePolicyState = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().describe('The name of the policy for this policyBase').nullable(),
      platformType: microsoft_graph_policyPlatformType.describe(
        'Supported platform types for policies.'
      ),
      settingCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Count of how many setting a policy holds'),
      settingStates: z.array(microsoft_graph_deviceCompliancePolicySettingState),
      state: microsoft_graph_complianceStatus,
      version: z.number().gte(-2147483648).lte(2147483647).describe('The version of the policy'),
    })
    .partial()
    .strict()
);
const microsoft_graph_deviceConfigurationSettingState = z
  .object({
    currentValue: z.string().describe('Current value of setting on device').nullable(),
    errorCode: z.number().describe('Error code for the setting'),
    errorDescription: z.string().describe('Error description').nullable(),
    instanceDisplayName: z
      .string()
      .describe('Name of setting instance that is being reported.')
      .nullable(),
    setting: z.string().describe('The setting that is being reported').nullable(),
    settingName: z
      .string()
      .describe('Localized/user friendly setting name that is being reported')
      .nullable(),
    sources: z.array(microsoft_graph_settingSource).describe('Contributing policies'),
    state: microsoft_graph_complianceStatus,
    userEmail: z.string().describe('UserEmail').nullable(),
    userId: z.string().describe('UserId').nullable(),
    userName: z.string().describe('UserName').nullable(),
    userPrincipalName: z.string().describe('UserPrincipalName.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_deviceConfigurationState = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().describe('The name of the policy for this policyBase').nullable(),
      platformType: microsoft_graph_policyPlatformType.describe(
        'Supported platform types for policies.'
      ),
      settingCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Count of how many setting a policy holds'),
      settingStates: z.array(microsoft_graph_deviceConfigurationSettingState),
      state: microsoft_graph_complianceStatus,
      version: z.number().gte(-2147483648).lte(2147483647).describe('The version of the policy'),
    })
    .partial()
    .strict()
);
const microsoft_graph_appLogUploadState = z.enum([
  'pending',
  'completed',
  'failed',
  'unknownFutureValue',
]);
const microsoft_graph_deviceLogCollectionResponse = microsoft_graph_entity.and(
  z
    .object({
      enrolledByUser: z
        .string()
        .describe('The User Principal Name (UPN) of the user that enrolled the device.')
        .nullable(),
      expirationDateTimeUTC: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The DateTime of the expiration of the logs.')
        .nullable(),
      initiatedByUserPrincipalName: z
        .string()
        .describe('The UPN for who initiated the request.')
        .nullable(),
      managedDeviceId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .describe('Indicates Intune device unique identifier.'),
      receivedDateTimeUTC: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The DateTime the request was received.')
        .nullable(),
      requestedDateTimeUTC: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The DateTime of the request.')
        .nullable(),
      sizeInKB: z
        .union([z.number(), z.string(), ReferenceNumeric])
        .describe(
          'The size of the logs in KB. Valid values -1.79769313486232E+308 to 1.79769313486232E+308'
        ),
      status: microsoft_graph_appLogUploadState.describe('AppLogUploadStatus'),
    })
    .partial()
    .strict()
);
const microsoft_graph_windowsDeviceHealthState = z.enum([
  'clean',
  'fullScanPending',
  'rebootPending',
  'manualStepsPending',
  'offlineScanPending',
  'critical',
]);
const microsoft_graph_windowsDefenderProductStatus = z.enum([
  'noStatus',
  'serviceNotRunning',
  'serviceStartedWithoutMalwareProtection',
  'pendingFullScanDueToThreatAction',
  'pendingRebootDueToThreatAction',
  'pendingManualStepsDueToThreatAction',
  'avSignaturesOutOfDate',
  'asSignaturesOutOfDate',
  'noQuickScanHappenedForSpecifiedPeriod',
  'noFullScanHappenedForSpecifiedPeriod',
  'systemInitiatedScanInProgress',
  'systemInitiatedCleanInProgress',
  'samplesPendingSubmission',
  'productRunningInEvaluationMode',
  'productRunningInNonGenuineMode',
  'productExpired',
  'offlineScanRequired',
  'serviceShutdownAsPartOfSystemShutdown',
  'threatRemediationFailedCritically',
  'threatRemediationFailedNonCritically',
  'noStatusFlagsSet',
  'platformOutOfDate',
  'platformUpdateInProgress',
  'platformAboutToBeOutdated',
  'signatureOrPlatformEndOfLifeIsPastOrIsImpending',
  'windowsSModeSignaturesInUseOnNonWin10SInstall',
]);
const microsoft_graph_windowsMalwareCategory = z.enum([
  'invalid',
  'adware',
  'spyware',
  'passwordStealer',
  'trojanDownloader',
  'worm',
  'backdoor',
  'remoteAccessTrojan',
  'trojan',
  'emailFlooder',
  'keylogger',
  'dialer',
  'monitoringSoftware',
  'browserModifier',
  'cookie',
  'browserPlugin',
  'aolExploit',
  'nuker',
  'securityDisabler',
  'jokeProgram',
  'hostileActiveXControl',
  'softwareBundler',
  'stealthNotifier',
  'settingsModifier',
  'toolBar',
  'remoteControlSoftware',
  'trojanFtp',
  'potentialUnwantedSoftware',
  'icqExploit',
  'trojanTelnet',
  'exploit',
  'filesharingProgram',
  'malwareCreationTool',
  'remote_Control_Software',
  'tool',
  'trojanDenialOfService',
  'trojanDropper',
  'trojanMassMailer',
  'trojanMonitoringSoftware',
  'trojanProxyServer',
  'virus',
  'known',
  'unknown',
  'spp',
  'behavior',
  'vulnerability',
  'policy',
  'enterpriseUnwantedSoftware',
  'ransom',
  'hipsRule',
]);
const microsoft_graph_windowsMalwareExecutionState = z.enum([
  'unknown',
  'blocked',
  'allowed',
  'running',
  'notRunning',
]);
const microsoft_graph_windowsMalwareSeverity = z.enum([
  'unknown',
  'low',
  'moderate',
  'high',
  'severe',
]);
const microsoft_graph_windowsMalwareState = z.enum([
  'unknown',
  'detected',
  'cleaned',
  'quarantined',
  'removed',
  'allowed',
  'blocked',
  'cleanFailed',
  'quarantineFailed',
  'removeFailed',
  'allowFailed',
  'abandoned',
  'blockFailed',
]);
const microsoft_graph_windowsMalwareThreatState = z.enum([
  'active',
  'actionFailed',
  'manualStepsRequired',
  'fullScanRequired',
  'rebootRequired',
  'remediatedWithNonCriticalFailures',
  'quarantined',
  'removed',
  'cleaned',
  'allowed',
  'noStatusCleared',
]);
const microsoft_graph_windowsDeviceMalwareState = microsoft_graph_entity.and(
  z
    .object({
      additionalInformationUrl: z
        .string()
        .describe('Information URL to learn more about the malware')
        .nullable(),
      category: z
        .union([microsoft_graph_windowsMalwareCategory, z.object({}).partial().strict()])
        .describe(
          'Category of the malware. Possible values are: invalid, adware, spyware, passwordStealer, trojanDownloader, worm, backdoor, remoteAccessTrojan, trojan, emailFlooder, keylogger, dialer, monitoringSoftware, browserModifier, cookie, browserPlugin, aolExploit, nuker, securityDisabler, jokeProgram, hostileActiveXControl, softwareBundler, stealthNotifier, settingsModifier, toolBar, remoteControlSoftware, trojanFtp, potentialUnwantedSoftware, icqExploit, trojanTelnet, exploit, filesharingProgram, malwareCreationTool, remoteControlSoftware, tool, trojanDenialOfService, trojanDropper, trojanMassMailer, trojanMonitoringSoftware, trojanProxyServer, virus, known, unknown, spp, behavior, vulnerability, policy, enterpriseUnwantedSoftware, ransom, hipsRule.'
        ),
      detectionCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Number of times the malware is detected')
        .nullable(),
      displayName: z.string().describe('Malware name').nullable(),
      executionState: z
        .union([microsoft_graph_windowsMalwareExecutionState, z.object({}).partial().strict()])
        .describe(
          'Execution status of the malware like blocked/executing etc. Possible values are: unknown, blocked, allowed, running, notRunning.'
        ),
      initialDetectionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Initial detection datetime of the malware')
        .nullable(),
      lastStateChangeDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The last time this particular threat was changed')
        .nullable(),
      severity: z
        .union([microsoft_graph_windowsMalwareSeverity, z.object({}).partial().strict()])
        .describe(
          'Severity of the malware. Possible values are: unknown, low, moderate, high, severe.'
        ),
      state: z
        .union([microsoft_graph_windowsMalwareState, z.object({}).partial().strict()])
        .describe(
          'Current status of the malware like cleaned/quarantined/allowed etc. Possible values are: unknown, detected, cleaned, quarantined, removed, allowed, blocked, cleanFailed, quarantineFailed, removeFailed, allowFailed, abandoned, blockFailed.'
        ),
      threatState: z
        .union([microsoft_graph_windowsMalwareThreatState, z.object({}).partial().strict()])
        .describe(
          'Current status of the malware like cleaned/quarantined/allowed etc. Possible values are: active, actionFailed, manualStepsRequired, fullScanRequired, rebootRequired, remediatedWithNonCriticalFailures, quarantined, removed, cleaned, allowed, noStatusCleared.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_windowsProtectionState = microsoft_graph_entity.and(
  z
    .object({
      antiMalwareVersion: z.string().describe('Current anti malware version').nullable(),
      deviceState: z
        .union([microsoft_graph_windowsDeviceHealthState, z.object({}).partial().strict()])
        .describe(
          "Indicates device's health state. Possible values are: clean, fullScanPending, rebootPending, manualStepsPending, offlineScanPending, critical. Possible values are: clean, fullScanPending, rebootPending, manualStepsPending, offlineScanPending, critical."
        ),
      engineVersion: z.string().describe("Current endpoint protection engine's version").nullable(),
      fullScanOverdue: z
        .boolean()
        .describe(
          'When TRUE indicates full scan is overdue, when FALSE indicates full scan is not overdue. Defaults to setting on client device.'
        )
        .nullable(),
      fullScanRequired: z
        .boolean()
        .describe(
          'When TRUE indicates full scan is required, when FALSE indicates full scan is not required. Defaults to setting on client device.'
        )
        .nullable(),
      isVirtualMachine: z
        .boolean()
        .describe(
          'When TRUE indicates the device is a virtual machine, when FALSE indicates the device is not a virtual machine. Defaults to setting on client device.'
        )
        .nullable(),
      lastFullScanDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Last quick scan datetime')
        .nullable(),
      lastFullScanSignatureVersion: z
        .string()
        .describe('Last full scan signature version')
        .nullable(),
      lastQuickScanDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Last quick scan datetime')
        .nullable(),
      lastQuickScanSignatureVersion: z
        .string()
        .describe('Last quick scan signature version')
        .nullable(),
      lastReportedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Last device health status reported time')
        .nullable(),
      malwareProtectionEnabled: z
        .boolean()
        .describe(
          'When TRUE indicates anti malware is enabled when FALSE indicates anti malware is not enabled.'
        )
        .nullable(),
      networkInspectionSystemEnabled: z
        .boolean()
        .describe(
          'When TRUE indicates network inspection system enabled, when FALSE indicates network inspection system is not enabled. Defaults to setting on client device.'
        )
        .nullable(),
      productStatus: z
        .union([microsoft_graph_windowsDefenderProductStatus, z.object({}).partial().strict()])
        .describe(
          'Product Status of Windows Defender Antivirus. Possible values are: noStatus, serviceNotRunning, serviceStartedWithoutMalwareProtection, pendingFullScanDueToThreatAction, pendingRebootDueToThreatAction, pendingManualStepsDueToThreatAction, avSignaturesOutOfDate, asSignaturesOutOfDate, noQuickScanHappenedForSpecifiedPeriod, noFullScanHappenedForSpecifiedPeriod, systemInitiatedScanInProgress, systemInitiatedCleanInProgress, samplesPendingSubmission, productRunningInEvaluationMode, productRunningInNonGenuineMode, productExpired, offlineScanRequired, serviceShutdownAsPartOfSystemShutdown, threatRemediationFailedCritically, threatRemediationFailedNonCritically, noStatusFlagsSet, platformOutOfDate, platformUpdateInProgress, platformAboutToBeOutdated, signatureOrPlatformEndOfLifeIsPastOrIsImpending, windowsSModeSignaturesInUseOnNonWin10SInstall. Possible values are: noStatus, serviceNotRunning, serviceStartedWithoutMalwareProtection, pendingFullScanDueToThreatAction, pendingRebootDueToThreatAction, pendingManualStepsDueToThreatAction, avSignaturesOutOfDate, asSignaturesOutOfDate, noQuickScanHappenedForSpecifiedPeriod, noFullScanHappenedForSpecifiedPeriod, systemInitiatedScanInProgress, systemInitiatedCleanInProgress, samplesPendingSubmission, productRunningInEvaluationMode, productRunningInNonGenuineMode, productExpired, offlineScanRequired, serviceShutdownAsPartOfSystemShutdown, threatRemediationFailedCritically, threatRemediationFailedNonCritically, noStatusFlagsSet, platformOutOfDate, platformUpdateInProgress, platformAboutToBeOutdated, signatureOrPlatformEndOfLifeIsPastOrIsImpending, windowsSModeSignaturesInUseOnNonWin10SInstall.'
        ),
      quickScanOverdue: z
        .boolean()
        .describe(
          'When TRUE indicates quick scan is overdue, when FALSE indicates quick scan is not overdue. Defaults to setting on client device.'
        )
        .nullable(),
      realTimeProtectionEnabled: z
        .boolean()
        .describe(
          'When TRUE indicates real time protection is enabled, when FALSE indicates real time protection is not enabled. Defaults to setting on client device.'
        )
        .nullable(),
      rebootRequired: z
        .boolean()
        .describe(
          'When TRUE indicates reboot is required, when FALSE indicates when TRUE indicates reboot is not required. Defaults to setting on client device.'
        )
        .nullable(),
      signatureUpdateOverdue: z
        .boolean()
        .describe(
          'When TRUE indicates signature is out of date, when FALSE indicates signature is not out of date. Defaults to setting on client device.'
        )
        .nullable(),
      signatureVersion: z.string().describe('Current malware definitions version').nullable(),
      tamperProtectionEnabled: z
        .boolean()
        .describe(
          'When TRUE indicates the Windows Defender tamper protection feature is enabled, when FALSE indicates the Windows Defender tamper protection feature is not enabled. Defaults to setting on client device.'
        )
        .nullable(),
      detectedMalwareState: z
        .array(microsoft_graph_windowsDeviceMalwareState)
        .describe('Device malware list'),
    })
    .partial()
    .strict()
);
const microsoft_graph_managedDevice: z.ZodType<microsoft_graph_managedDevice> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        activationLockBypassCode: z
          .string()
          .describe(
            'The code that allows the Activation Lock on managed device to be bypassed. Default, is Null (Non-Default property) for this property when returned as part of managedDevice entity in LIST call. To retrieve actual values GET call needs to be made, with device id and included in select parameter. Supports: $select. $Search is not supported. Read-only. This property is read-only.'
          )
          .nullable(),
        androidSecurityPatchLevel: z
          .string()
          .describe('Android security patch level. This property is read-only.')
          .nullable(),
        azureADDeviceId: z
          .string()
          .describe(
            'The unique identifier for the Azure Active Directory device. Read only. This property is read-only.'
          )
          .nullable(),
        azureADRegistered: z
          .boolean()
          .describe(
            'Whether the device is Azure Active Directory registered. This property is read-only.'
          )
          .nullable(),
        complianceGracePeriodExpirationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The DateTime when device compliance grace period expires. This property is read-only.'
          ),
        complianceState: microsoft_graph_complianceState.describe('Compliance state.'),
        configurationManagerClientEnabledFeatures: z
          .union([
            microsoft_graph_configurationManagerClientEnabledFeatures,
            z.object({}).partial().strict(),
          ])
          .describe('ConfigrMgr client enabled features. This property is read-only.'),
        deviceActionResults: z
          .array(microsoft_graph_deviceActionResult)
          .describe('List of ComplexType deviceActionResult objects. This property is read-only.'),
        deviceCategoryDisplayName: z
          .string()
          .describe(
            "Device category display name. Default is an empty string. Supports $filter operator 'eq' and 'or'. This property is read-only."
          )
          .nullable(),
        deviceEnrollmentType: microsoft_graph_deviceEnrollmentType.describe(
          'Possible ways of adding a mobile device to management.'
        ),
        deviceHealthAttestationState: z
          .union([microsoft_graph_deviceHealthAttestationState, z.object({}).partial().strict()])
          .describe('The device health attestation state. This property is read-only.'),
        deviceName: z
          .string()
          .describe('Name of the device. This property is read-only.')
          .nullable(),
        deviceRegistrationState: microsoft_graph_deviceRegistrationState.describe(
          'Device registration status.'
        ),
        easActivated: z
          .boolean()
          .describe(
            'Whether the device is Exchange ActiveSync activated. This property is read-only.'
          ),
        easActivationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Exchange ActivationSync activation time of the device. This property is read-only.'
          ),
        easDeviceId: z
          .string()
          .describe('Exchange ActiveSync Id of the device. This property is read-only.')
          .nullable(),
        emailAddress: z
          .string()
          .describe('Email(s) for the user associated with the device. This property is read-only.')
          .nullable(),
        enrolledDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "Enrollment time of the device. Supports $filter operator 'lt' and 'gt'. This property is read-only."
          ),
        enrollmentProfileName: z
          .string()
          .describe(
            'Name of the enrollment profile assigned to the device. Default value is empty string, indicating no enrollment profile was assgined. This property is read-only.'
          )
          .nullable(),
        ethernetMacAddress: z
          .string()
          .describe(
            'Indicates Ethernet MAC Address of the device. Default, is Null (Non-Default property) for this property when returned as part of managedDevice entity. Individual get call with select query options is needed to retrieve actual values. Example: deviceManagement/managedDevices({managedDeviceId})?$select=ethernetMacAddress Supports: $select. $Search is not supported. Read-only. This property is read-only.'
          )
          .nullable(),
        exchangeAccessState: microsoft_graph_deviceManagementExchangeAccessState.describe(
          'Device Exchange Access State.'
        ),
        exchangeAccessStateReason:
          microsoft_graph_deviceManagementExchangeAccessStateReason.describe(
            'Device Exchange Access State Reason.'
          ),
        exchangeLastSuccessfulSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Last time the device contacted Exchange. This property is read-only.'),
        freeStorageSpaceInBytes: z
          .number()
          .describe(
            'Free Storage in Bytes. Default value is 0. Read-only. This property is read-only.'
          ),
        iccid: z
          .string()
          .describe(
            "Integrated Circuit Card Identifier, it is A SIM card's unique identification number. Default is an empty string. To retrieve actual values GET call needs to be made, with device id and included in select parameter. Supports: $select. $Search is not supported. Read-only. This property is read-only."
          )
          .nullable(),
        imei: z.string().describe('IMEI. This property is read-only.').nullable(),
        isEncrypted: z.boolean().describe('Device encryption status. This property is read-only.'),
        isSupervised: z.boolean().describe('Device supervised status. This property is read-only.'),
        jailBroken: z
          .string()
          .describe(
            "Whether the device is jail broken or rooted. Default is an empty string. Supports $filter operator 'eq' and 'or'. This property is read-only."
          )
          .nullable(),
        lastSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "The date and time that the device last completed a successful sync with Intune. Supports $filter operator 'lt' and 'gt'. This property is read-only."
          ),
        managedDeviceName: z
          .string()
          .describe(
            'Automatically generated name to identify a device. Can be overwritten to a user friendly name.'
          )
          .nullable(),
        managedDeviceOwnerType:
          microsoft_graph_managedDeviceOwnerType.describe('Owner type of device.'),
        managementAgent: microsoft_graph_managementAgentType,
        managementCertificateExpirationDate: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Reports device management certificate expiration date. This property is read-only.'
          ),
        manufacturer: z
          .string()
          .describe('Manufacturer of the device. This property is read-only.')
          .nullable(),
        meid: z.string().describe('MEID. This property is read-only.').nullable(),
        model: z.string().describe('Model of the device. This property is read-only.').nullable(),
        notes: z
          .string()
          .describe(
            'Notes on the device created by IT Admin. Default is null. To retrieve actual values GET call needs to be made, with device id and included in select parameter. Supports: $select. $Search is not supported.'
          )
          .nullable(),
        operatingSystem: z
          .string()
          .describe(
            'Operating system of the device. Windows, iOS, etc. This property is read-only.'
          )
          .nullable(),
        osVersion: z
          .string()
          .describe('Operating system version of the device. This property is read-only.')
          .nullable(),
        partnerReportedThreatState:
          microsoft_graph_managedDevicePartnerReportedHealthState.describe(
            'Available health states for the Device Health API'
          ),
        phoneNumber: z
          .string()
          .describe('Phone number of the device. This property is read-only.')
          .nullable(),
        physicalMemoryInBytes: z
          .number()
          .describe(
            'Total Memory in Bytes. Default is 0. To retrieve actual values GET call needs to be made, with device id and included in select parameter. Supports: $select. Read-only. This property is read-only.'
          ),
        remoteAssistanceSessionErrorDetails: z
          .string()
          .describe(
            'An error string that identifies issues when creating Remote Assistance session objects. This property is read-only.'
          )
          .nullable(),
        remoteAssistanceSessionUrl: z
          .string()
          .describe(
            'Url that allows a Remote Assistance session to be established with the device. Default is an empty string. To retrieve actual values GET call needs to be made, with device id and included in select parameter. This property is read-only.'
          )
          .nullable(),
        requireUserEnrollmentApproval: z
          .boolean()
          .describe(
            'Reports if the managed iOS device is user approval enrollment. This property is read-only.'
          )
          .nullable(),
        serialNumber: z.string().describe('SerialNumber. This property is read-only.').nullable(),
        subscriberCarrier: z
          .string()
          .describe('Subscriber Carrier. This property is read-only.')
          .nullable(),
        totalStorageSpaceInBytes: z
          .number()
          .describe('Total Storage in Bytes. This property is read-only.'),
        udid: z
          .string()
          .describe(
            'Unique Device Identifier for iOS and macOS devices. Default is an empty string. To retrieve actual values GET call needs to be made, with device id and included in select parameter. Supports: $select. $Search is not supported. Read-only. This property is read-only.'
          )
          .nullable(),
        userDisplayName: z
          .string()
          .describe('User display name. This property is read-only.')
          .nullable(),
        userId: z
          .string()
          .describe(
            'Unique Identifier for the user associated with the device. This property is read-only.'
          )
          .nullable(),
        userPrincipalName: z
          .string()
          .describe('Device user principal name. This property is read-only.')
          .nullable(),
        wiFiMacAddress: z.string().describe('Wi-Fi MAC. This property is read-only.').nullable(),
        deviceCategory: z
          .union([microsoft_graph_deviceCategory, z.object({}).partial().strict()])
          .describe('Device category'),
        deviceCompliancePolicyStates: z
          .array(microsoft_graph_deviceCompliancePolicyState)
          .describe('Device compliance policy states for this device.'),
        deviceConfigurationStates: z
          .array(microsoft_graph_deviceConfigurationState)
          .describe('Device configuration states for this device.'),
        logCollectionRequests: z
          .array(microsoft_graph_deviceLogCollectionResponse)
          .describe('List of log collection requests'),
        users: z
          .array(microsoft_graph_user)
          .describe('The primary users associated with the managed device.'),
        windowsProtectionState: z
          .union([microsoft_graph_windowsProtectionState, z.object({}).partial().strict()])
          .describe('The device protection status. This property is read-only.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_oAuth2PermissionGrant = microsoft_graph_entity.and(
  z
    .object({
      clientId: z
        .string()
        .describe(
          "The object id (not appId) of the client service principal for the application that's authorized to act on behalf of a signed-in user when accessing an API. Required. Supports $filter (eq only)."
        ),
      consentType: z
        .string()
        .describe(
          'Indicates if authorization is granted for the client application to impersonate all users or only a specific user. AllPrincipals indicates authorization to impersonate all users. Principal indicates authorization to impersonate a specific user. Consent on behalf of all users can be granted by an administrator. Nonadmin users might be authorized to consent on behalf of themselves in some cases, for some delegated permissions. Required. Supports $filter (eq only).'
        )
        .nullable(),
      principalId: z
        .string()
        .describe(
          'The id of the user on behalf of whom the client is authorized to access the resource, when consentType is Principal. If consentType is AllPrincipals this value is null. Required when consentType is Principal. Supports $filter (eq only).'
        )
        .nullable(),
      resourceId: z
        .string()
        .describe(
          'The id of the resource service principal to which access is authorized. This identifies the API that the client is authorized to attempt to call on behalf of a signed-in user. Supports $filter (eq only).'
        ),
      scope: z
        .string()
        .describe(
          'A space-separated list of the claim values for delegated permissions that should be included in access tokens for the resource application (the API). For example, openid User.Read GroupMember.Read.All. Each claim value should match the value field of one of the delegated permissions defined by the API, listed in the oauth2PermissionScopes property of the resource service principal. Must not exceed 3,850 characters in length.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_allowedLobbyAdmitterRoles = z.enum([
  'organizerAndCoOrganizersAndPresenters',
  'organizerAndCoOrganizers',
  'unknownFutureValue',
]);
const microsoft_graph_onlineMeetingPresenters = z.enum([
  'everyone',
  'organization',
  'roleIsPresenter',
  'organizer',
  'unknownFutureValue',
]);
const microsoft_graph_meetingLiveShareOptions = z.enum([
  'enabled',
  'disabled',
  'unknownFutureValue',
]);
const microsoft_graph_meetingChatMode = z.enum([
  'enabled',
  'disabled',
  'limited',
  'unknownFutureValue',
]);
const microsoft_graph_audioConferencing = z
  .object({
    conferenceId: z.string().describe('The conference id of the online meeting.').nullable(),
    dialinUrl: z
      .string()
      .describe('A URL to the externally-accessible web page that contains dial-in information.')
      .nullable(),
    tollFreeNumber: z
      .string()
      .describe('The toll-free number that connects to the Audio Conference Provider.')
      .nullable(),
    tollFreeNumbers: z
      .array(z.string().nullable())
      .describe('List of toll-free numbers that are displayed in the meeting invite.'),
    tollNumber: z
      .string()
      .describe('The toll number that connects to the Audio Conference Provider.')
      .nullable(),
    tollNumbers: z
      .array(z.string().nullable())
      .describe('List of toll numbers that are displayed in the meeting invite.'),
  })
  .partial()
  .strict();
const microsoft_graph_chatInfo = z
  .object({
    messageId: z
      .string()
      .describe('The unique identifier of a message in a Microsoft Teams channel.')
      .nullable(),
    replyChainMessageId: z.string().describe('The ID of the reply message.').nullable(),
    threadId: z
      .string()
      .describe('The unique identifier for a thread in Microsoft Teams.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_chatRestrictions = z
  .object({
    allowTextOnly: z
      .boolean()
      .describe('Indicates whether only text is allowed in the meeting chat. Optional.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_joinMeetingIdSettings = z
  .object({
    isPasscodeRequired: z
      .boolean()
      .describe(
        'Indicates whether a passcode is required to join a meeting when using joinMeetingId. Optional.'
      )
      .nullable(),
    joinMeetingId: z
      .string()
      .describe('The meeting ID to be used to join a meeting. Optional. Read-only.')
      .nullable(),
    passcode: z
      .string()
      .describe('The passcode to join a meeting.  Optional. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_lobbyBypassScope = z.enum([
  'organizer',
  'organization',
  'organizationAndFederated',
  'everyone',
  'unknownFutureValue',
  'invited',
  'organizationExcludingGuests',
]);
const microsoft_graph_lobbyBypassSettings = z
  .object({
    isDialInBypassEnabled: z
      .boolean()
      .describe(
        'Specifies whether or not to always let dial-in callers bypass the lobby. Optional.'
      )
      .nullable(),
    scope: z
      .union([microsoft_graph_lobbyBypassScope, z.object({}).partial().strict()])
      .describe(
        'Specifies the type of participants that are automatically admitted into a meeting, bypassing the lobby. Optional.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_meetingChatHistoryDefaultMode = z.enum(['none', 'all', 'unknownFutureValue']);
const microsoft_graph_watermarkProtectionValues = z
  .object({
    isEnabledForContentSharing: z
      .boolean()
      .describe('Indicates whether to apply a watermark to any shared content.')
      .nullable(),
    isEnabledForVideo: z
      .boolean()
      .describe("Indicates whether to apply a watermark to everyone's video feed.")
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_virtualEventExternalInformation = z
  .object({
    applicationId: z
      .string()
      .describe('Identifier of the application that hosts the externalEventId. Read-only.')
      .nullable(),
    externalEventId: z
      .string()
      .describe(
        'The identifier for a virtualEventExternalInformation object that associates the virtual event with an event ID in an external application. This association bundles all the information (both supported and not supported in virtualEvent) into one virtual event object. Optional. If set, the maximum supported length is 256 characters.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_attendanceInterval = z
  .object({
    durationInSeconds: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'Duration of the meeting interval in seconds; that is, the difference between joinDateTime and leaveDateTime.'
      )
      .nullable(),
    joinDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The time the attendee joined in UTC.')
      .nullable(),
    leaveDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The time the attendee left in UTC.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_virtualEventExternalRegistrationInformation = z
  .object({
    referrer: z
      .string()
      .describe(
        'A URL or string that represents the location from which the registrant registered. Optional.'
      )
      .nullable(),
    registrationId: z
      .string()
      .describe(
        'The identifier for a virtualEventExternalRegistrationInformation object. Optional. If set, the maximum supported length is 256 characters.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_attendanceRecord = microsoft_graph_entity.and(
  z
    .object({
      attendanceIntervals: z
        .array(microsoft_graph_attendanceInterval)
        .describe('List of time periods between joining and leaving a meeting.'),
      emailAddress: z
        .string()
        .describe('Email address of the user associated with this attendance record.')
        .nullable(),
      externalRegistrationInformation: z
        .union([
          microsoft_graph_virtualEventExternalRegistrationInformation,
          z.object({}).partial().strict(),
        ])
        .describe('The external information for a virtualEventRegistration.'),
      identity: z
        .union([microsoft_graph_identity, z.object({}).partial().strict()])
        .describe(
          'The identity of the user associated with this attendance record. The specific type is one of the following derived types of identity, depending on the user type: communicationsUserIdentity, azureCommunicationServicesUserIdentity.'
        ),
      registrationId: z
        .string()
        .describe(
          'Unique identifier of a virtualEventRegistration that is available to all participants registered for the virtualEventWebinar.'
        )
        .nullable(),
      role: z
        .string()
        .describe(
          'Role of the attendee. Possible values are: None, Attendee, Presenter, and Organizer.'
        )
        .nullable(),
      totalAttendanceInSeconds: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Total duration of the attendances in seconds.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_meetingAttendanceReport = microsoft_graph_entity.and(
  z
    .object({
      externalEventInformation: z
        .array(microsoft_graph_virtualEventExternalInformation)
        .describe(
          'The external information of a virtual event. Returned only for event organizers or coorganizers. Read-only.'
        ),
      meetingEndDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('UTC time when the meeting ended. Read-only.')
        .nullable(),
      meetingStartDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('UTC time when the meeting started. Read-only.')
        .nullable(),
      totalParticipantCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Total number of participants. Read-only.')
        .nullable(),
      attendanceRecords: z
        .array(microsoft_graph_attendanceRecord)
        .describe('List of attendance records of an attendance report. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_onlineMeetingBase = microsoft_graph_entity.and(
  z
    .object({
      allowAttendeeToEnableCamera: z
        .boolean()
        .describe('Indicates whether attendees can turn on their camera.')
        .nullable(),
      allowAttendeeToEnableMic: z
        .boolean()
        .describe('Indicates whether attendees can turn on their microphone.')
        .nullable(),
      allowBreakoutRooms: z
        .boolean()
        .describe('Indicates whether breakout rooms are enabled for the meeting.')
        .nullable(),
      allowedLobbyAdmitters: z
        .union([microsoft_graph_allowedLobbyAdmitterRoles, z.object({}).partial().strict()])
        .describe(
          'Specifies the users who can admit from the lobby. Possible values are: organizerAndCoOrganizersAndPresenters, organizerAndCoOrganizers, unknownFutureValue.'
        ),
      allowedPresenters: z
        .union([microsoft_graph_onlineMeetingPresenters, z.object({}).partial().strict()])
        .describe('Specifies who can be a presenter in a meeting.'),
      allowLiveShare: z
        .union([microsoft_graph_meetingLiveShareOptions, z.object({}).partial().strict()])
        .describe(
          'Indicates whether live share is enabled for the meeting. Possible values are: enabled, disabled, unknownFutureValue.'
        ),
      allowMeetingChat: z
        .union([microsoft_graph_meetingChatMode, z.object({}).partial().strict()])
        .describe('Specifies the mode of the meeting chat.'),
      allowParticipantsToChangeName: z
        .boolean()
        .describe(
          'Specifies if participants are allowed to rename themselves in an instance of the meeting.'
        )
        .nullable(),
      allowPowerPointSharing: z
        .boolean()
        .describe('Indicates whether PowerPoint live is enabled for the meeting.')
        .nullable(),
      allowRecording: z
        .boolean()
        .describe('Indicates whether recording is enabled for the meeting.')
        .nullable(),
      allowTeamworkReactions: z
        .boolean()
        .describe('Indicates if Teams reactions are enabled for the meeting.')
        .nullable(),
      allowTranscription: z
        .boolean()
        .describe('Indicates whether transcription is enabled for the meeting.')
        .nullable(),
      allowWhiteboard: z
        .boolean()
        .describe('Indicates whether whiteboard is enabled for the meeting.')
        .nullable(),
      audioConferencing: z
        .union([microsoft_graph_audioConferencing, z.object({}).partial().strict()])
        .describe('The phone access (dial-in) information for an online meeting. Read-only.'),
      chatInfo: z
        .union([microsoft_graph_chatInfo, z.object({}).partial().strict()])
        .describe('The chat information associated with this online meeting.'),
      chatRestrictions: z
        .union([microsoft_graph_chatRestrictions, z.object({}).partial().strict()])
        .describe('Specifies the configuration settings for meeting chat restrictions.'),
      isEntryExitAnnounced: z
        .boolean()
        .describe('Indicates whether to announce when callers join or leave.')
        .nullable(),
      joinInformation: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe(
          "The join information in the language and locale variant specified in 'Accept-Language' request HTTP header. Read-only."
        ),
      joinMeetingIdSettings: z
        .union([microsoft_graph_joinMeetingIdSettings, z.object({}).partial().strict()])
        .describe(
          "Specifies the joinMeetingId, the meeting passcode, and the requirement for the passcode. Once an onlineMeeting is created, the joinMeetingIdSettings can't be modified. To make any changes to this property, you must cancel this meeting and create a new one."
        ),
      joinWebUrl: z.string().describe('The join URL of the online meeting. Read-only.').nullable(),
      lobbyBypassSettings: z
        .union([microsoft_graph_lobbyBypassSettings, z.object({}).partial().strict()])
        .describe('Specifies which participants can bypass the meeting lobby.'),
      recordAutomatically: z
        .boolean()
        .describe('Indicates whether to record the meeting automatically.')
        .nullable(),
      shareMeetingChatHistoryDefault: z
        .union([microsoft_graph_meetingChatHistoryDefaultMode, z.object({}).partial().strict()])
        .describe(
          'Specifies whether meeting chat history is shared with participants.  Possible values are: all, none, unknownFutureValue.'
        ),
      subject: z.string().describe('The subject of the online meeting.').nullable(),
      videoTeleconferenceId: z
        .string()
        .describe('The video teleconferencing ID. Read-only.')
        .nullable(),
      watermarkProtection: z
        .union([microsoft_graph_watermarkProtectionValues, z.object({}).partial().strict()])
        .describe(
          'Specifies whether the client application should apply a watermark to a content type.'
        ),
      attendanceReports: z
        .array(microsoft_graph_meetingAttendanceReport)
        .describe('The attendance reports of an online meeting. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_broadcastMeetingAudience = z.enum([
  'roleIsAttendee',
  'organization',
  'everyone',
  'unknownFutureValue',
]);
const microsoft_graph_broadcastMeetingCaptionSettings = z
  .object({
    isCaptionEnabled: z
      .boolean()
      .describe('Indicates whether captions are enabled for this Teams live event.')
      .nullable(),
    spokenLanguage: z.string().describe('The spoken language.').nullable(),
    translationLanguages: z
      .array(z.string().nullable())
      .describe('The translation languages (choose up to 6).'),
  })
  .partial()
  .strict();
const microsoft_graph_broadcastMeetingSettings = z
  .object({
    allowedAudience: z
      .union([microsoft_graph_broadcastMeetingAudience, z.object({}).partial().strict()])
      .describe(
        'Defines who can join the Teams live event. Possible values are listed in the following table.'
      ),
    captions: z
      .union([microsoft_graph_broadcastMeetingCaptionSettings, z.object({}).partial().strict()])
      .describe('Caption settings of a Teams live event.'),
    isAttendeeReportEnabled: z
      .boolean()
      .describe(
        'Indicates whether attendee report is enabled for this Teams live event. Default value is false.'
      )
      .nullable(),
    isQuestionAndAnswerEnabled: z
      .boolean()
      .describe(
        'Indicates whether Q&A is enabled for this Teams live event. Default value is false.'
      )
      .nullable(),
    isRecordingEnabled: z
      .boolean()
      .describe(
        'Indicates whether recording is enabled for this Teams live event. Default value is false.'
      )
      .nullable(),
    isVideoOnDemandEnabled: z
      .boolean()
      .describe(
        'Indicates whether video on demand is enabled for this Teams live event. Default value is false.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_onlineMeetingRole = z.enum([
  'attendee',
  'presenter',
  'unknownFutureValue',
  'producer',
  'coorganizer',
]);
const microsoft_graph_meetingParticipantInfo = z
  .object({
    identity: z
      .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
      .describe('Identity information of the participant.'),
    role: z
      .union([microsoft_graph_onlineMeetingRole, z.object({}).partial().strict()])
      .describe("Specifies the participant's role in the meeting."),
    upn: z.string().describe('User principal name of the participant.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_meetingParticipants = z
  .object({
    attendees: z
      .array(microsoft_graph_meetingParticipantInfo)
      .describe('Information about the meeting attendees.'),
    organizer: z
      .union([microsoft_graph_meetingParticipantInfo, z.object({}).partial().strict()])
      .describe('Information about the meeting organizer.'),
  })
  .partial()
  .strict();
const microsoft_graph_callRecording = microsoft_graph_entity.and(
  z
    .object({
      callId: z
        .string()
        .describe(
          'The unique identifier for the call that is related to this recording. Read-only.'
        )
        .nullable(),
      content: z.string().describe('The content of the recording. Read-only.').nullable(),
      contentCorrelationId: z
        .string()
        .describe(
          'The unique identifier that links the transcript with its corresponding recording. Read-only.'
        )
        .nullable(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time at which the recording was created. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      endDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time at which the recording ends. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      meetingId: z
        .string()
        .describe(
          'The unique identifier of the onlineMeeting related to this recording. Read-only.'
        )
        .nullable(),
      meetingOrganizer: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe(
          'The identity information of the organizer of the onlineMeeting related to this recording. Read-only.'
        ),
      recordingContentUrl: z
        .string()
        .describe('The URL that can be used to access the content of the recording. Read-only.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_callTranscript = microsoft_graph_entity.and(
  z
    .object({
      callId: z
        .string()
        .describe(
          'The unique identifier for the call that is related to this transcript. Read-only.'
        )
        .nullable(),
      content: z.string().describe('The content of the transcript. Read-only.').nullable(),
      contentCorrelationId: z
        .string()
        .describe(
          'The unique identifier that links the transcript with its corresponding recording. Read-only.'
        )
        .nullable(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time at which the transcript was created. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      endDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Date and time at which the transcription ends. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      meetingId: z
        .string()
        .describe(
          'The unique identifier of the online meeting related to this transcript. Read-only.'
        )
        .nullable(),
      meetingOrganizer: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe(
          'The identity information of the organizer of the onlineMeeting related to this transcript. Read-only.'
        ),
      metadataContent: z
        .string()
        .describe('The time-aligned metadata of the utterances in the transcript. Read-only.')
        .nullable(),
      transcriptContentUrl: z
        .string()
        .describe('The URL that can be used to access the content of the transcript. Read-only.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_onlineMeeting = microsoft_graph_onlineMeetingBase.and(
  z
    .object({
      attendeeReport: z
        .string()
        .describe(
          'The content stream of the attendee report of a Microsoft Teams live event. Read-only.'
        )
        .nullable(),
      broadcastSettings: z
        .union([microsoft_graph_broadcastMeetingSettings, z.object({}).partial().strict()])
        .describe('Settings related to a live event.'),
      creationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The meeting creation time in UTC. Read-only.')
        .nullable(),
      endDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The meeting end time in UTC. Required when you create an online meeting.')
        .nullable(),
      externalId: z.string().nullable(),
      isBroadcast: z
        .boolean()
        .describe('Indicates whether this meeting is a Teams live event.')
        .nullable(),
      meetingTemplateId: z.string().describe('The ID of the meeting template.').nullable(),
      participants: z
        .union([microsoft_graph_meetingParticipants, z.object({}).partial().strict()])
        .describe(
          'The participants associated with the online meeting, including the organizer and the attendees.'
        ),
      startDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The meeting start time in UTC.')
        .nullable(),
      recordings: z
        .array(microsoft_graph_callRecording)
        .describe('The recordings of an online meeting. Read-only.'),
      transcripts: z
        .array(microsoft_graph_callTranscript)
        .describe('The transcripts of an online meeting. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_categoryColor = z.enum([
  'none',
  'preset0',
  'preset1',
  'preset2',
  'preset3',
  'preset4',
  'preset5',
  'preset6',
  'preset7',
  'preset8',
  'preset9',
  'preset10',
  'preset11',
  'preset12',
  'preset13',
  'preset14',
  'preset15',
  'preset16',
  'preset17',
  'preset18',
  'preset19',
  'preset20',
  'preset21',
  'preset22',
  'preset23',
  'preset24',
]);
const microsoft_graph_outlookCategory = microsoft_graph_entity.and(
  z
    .object({
      color: z
        .union([microsoft_graph_categoryColor, z.object({}).partial().strict()])
        .describe(
          'A pre-set color constant that characterizes a category, and that is mapped to one of 25 predefined colors. For more details, see the following note.'
        ),
      displayName: z
        .string()
        .describe(
          "A unique name that identifies a category in the user's mailbox. After a category is created, the name cannot be changed. Read-only."
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_outlookUser = microsoft_graph_entity.and(
  z
    .object({
      masterCategories: z
        .array(microsoft_graph_outlookCategory)
        .describe('A list of categories defined for the user.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_personType = z
  .object({
    class: z.string().describe('The type of data source, such as Person.').nullable(),
    subclass: z
      .string()
      .describe('The secondary type of data source, such as OrganizationUser.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_selectionLikelihoodInfo = z.enum(['notSpecified', 'high']);
const microsoft_graph_scoredEmailAddress = z
  .object({
    address: z.string().describe('The email address.').nullable(),
    itemId: z.string().nullable(),
    relevanceScore: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe(
        'The relevance score of the email address. A relevance score is used as a sort key, in relation to the other returned results. A higher relevance score value corresponds to a more relevant result. Relevance is determined by the user’s communication and collaboration patterns and business relationships.'
      ),
    selectionLikelihood: z.union([
      microsoft_graph_selectionLikelihoodInfo,
      z.object({}).partial().strict(),
    ]),
  })
  .partial()
  .strict();
const microsoft_graph_websiteType = z.enum(['other', 'home', 'work', 'blog', 'profile']);
const microsoft_graph_website = z
  .object({
    address: z.string().describe('The URL of the website.').nullable(),
    displayName: z.string().describe('The display name of the web site.').nullable(),
    type: z
      .union([microsoft_graph_websiteType, z.object({}).partial().strict()])
      .describe('The possible values are: other, home, work, blog, profile.'),
  })
  .partial()
  .strict();
const microsoft_graph_person = microsoft_graph_entity.and(
  z
    .object({
      birthday: z.string().describe("The person's birthday.").nullable(),
      companyName: z.string().describe("The name of the person's company.").nullable(),
      department: z.string().describe("The person's department.").nullable(),
      displayName: z.string().describe("The person's display name.").nullable(),
      givenName: z.string().describe("The person's given name.").nullable(),
      imAddress: z
        .string()
        .describe(
          'The instant message voice over IP (VOIP) session initiation protocol (SIP) address for the user. Read-only.'
        )
        .nullable(),
      isFavorite: z
        .boolean()
        .describe('True if the user has flagged this person as a favorite.')
        .nullable(),
      jobTitle: z.string().describe("The person's job title.").nullable(),
      officeLocation: z.string().describe("The location of the person's office.").nullable(),
      personNotes: z
        .string()
        .describe('Free-form notes that the user has taken about this person.')
        .nullable(),
      personType: z
        .union([microsoft_graph_personType, z.object({}).partial().strict()])
        .describe('The type of person.'),
      phones: z.array(microsoft_graph_phone).describe("The person's phone numbers."),
      postalAddresses: z.array(microsoft_graph_location).describe("The person's addresses."),
      profession: z.string().describe("The person's profession.").nullable(),
      scoredEmailAddresses: z
        .array(microsoft_graph_scoredEmailAddress)
        .describe("The person's email addresses."),
      surname: z.string().describe("The person's surname.").nullable(),
      userPrincipalName: z
        .string()
        .describe(
          "The user principal name (UPN) of the person. The UPN is an Internet-style login name for the person based on the Internet standard RFC 822. By convention, this should map to the person's email name. The general format is alias@domain."
        )
        .nullable(),
      websites: z.array(microsoft_graph_website).describe("The person's websites."),
      yomiCompany: z
        .string()
        .describe("The phonetic Japanese name of the person's company.")
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_plannerUser = microsoft_graph_entity.and(
  z
    .object({
      plans: z
        .array(microsoft_graph_plannerPlan)
        .describe('Read-only. Nullable. Returns the plannerTasks assigned to the user.'),
      tasks: z
        .array(microsoft_graph_plannerTask)
        .describe('Read-only. Nullable. Returns the plannerPlans shared with the user.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_presenceStatusMessage = z
  .object({
    expiryDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
      .describe(
        "Time in which the status message expires.If not provided, the status message doesn't expire.expiryDateTime.dateTime shouldn't include time zone.expiryDateTime isn't available when you request the presence of another user."
      ),
    message: z
      .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
      .describe(
        "Status message item. The only supported format currently is message.contentType = 'text'."
      ),
    publishedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Time in which the status message was published.Read-only.publishedDateTime isn't available when you request the presence of another user."
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_presence = microsoft_graph_entity.and(
  z
    .object({
      activity: z
        .string()
        .describe(
          "The supplemental information to a user's availability. Possible values are Available, Away, BeRightBack, Busy, DoNotDisturb, InACall, InAConferenceCall, Inactive, InAMeeting, Offline, OffWork, OutOfOffice, PresenceUnknown, Presenting, UrgentInterruptionsOnly."
        )
        .nullable(),
      availability: z
        .string()
        .describe(
          'The base presence information for a user. Possible values are Available, AvailableIdle,  Away, BeRightBack, Busy, BusyIdle, DoNotDisturb, Offline, PresenceUnknown'
        )
        .nullable(),
      statusMessage: z
        .union([microsoft_graph_presenceStatusMessage, z.object({}).partial().strict()])
        .describe('The presence status message of a user.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_scopedRoleMembership = microsoft_graph_entity.and(
  z
    .object({
      administrativeUnitId: z
        .string()
        .describe(
          'Unique identifier for the administrative unit that the directory role is scoped to'
        ),
      roleId: z
        .string()
        .describe('Unique identifier for the directory role that the member is in.'),
      roleMemberInfo: microsoft_graph_identity,
    })
    .partial()
    .strict()
);
const microsoft_graph_userInsightsSettings = microsoft_graph_entity.and(
  z
    .object({
      isEnabled: z
        .boolean()
        .describe(
          "True if the user's itemInsights and meeting hours insights are enabled; false if the user's itemInsights and meeting hours insights are disabled. The default value is true. Optional."
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_timeRange = z
  .object({
    endTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .describe('End time for the time range.')
      .nullable(),
    startTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .describe('Start time for the time range.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_shiftAvailability = z
  .object({
    recurrence: z
      .union([microsoft_graph_patternedRecurrence, z.object({}).partial().strict()])
      .describe('Specifies the pattern for recurrence'),
    timeSlots: z
      .array(microsoft_graph_timeRange)
      .describe('The time slot(s) preferred by the user.'),
    timeZone: z.string().describe('Specifies the time zone for the indicated time.').nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_shiftPreferences = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      availability: z
        .array(microsoft_graph_shiftAvailability)
        .describe('Availability of the user to be scheduled for work and its recurrence pattern.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_storageQuotaBreakdown = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullable(),
      manageWebUrl: z.string().nullable(),
      used: z.number().nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_serviceStorageQuotaBreakdown = microsoft_graph_storageQuotaBreakdown.and(
  z.object({}).partial().strict()
);
const microsoft_graph_unifiedStorageQuota = microsoft_graph_entity.and(
  z
    .object({
      deleted: z.number().nullable(),
      manageWebUrl: z.string().nullable(),
      remaining: z.number().nullable(),
      state: z.string().nullable(),
      total: z.number().nullable(),
      used: z.number().nullable(),
      services: z.array(microsoft_graph_serviceStorageQuotaBreakdown),
    })
    .partial()
    .strict()
);
const microsoft_graph_userStorage = microsoft_graph_entity.and(
  z
    .object({
      quota: z.union([microsoft_graph_unifiedStorageQuota, z.object({}).partial().strict()]),
    })
    .partial()
    .strict()
);
const microsoft_graph_windowsSettingType = z.enum(['roaming', 'backup', 'unknownFutureValue']);
const microsoft_graph_windowsSettingInstance = microsoft_graph_entity.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Set by the server. Represents the dateTime in UTC when the object was created on the server.'
        ),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Set by the server. The object expires at the specified dateTime in UTC, making it unavailable after that time.'
        ),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "Set by the server if not provided in the request from the Windows client device. Refers to the user's Windows device that modified the object at the specified dateTime in UTC."
        )
        .nullable(),
      payload: z.string().describe('Base64-encoded JSON setting value.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_windowsSetting = microsoft_graph_entity.and(
  z
    .object({
      payloadType: z
        .string()
        .describe('The type of setting payloads contained in the instances navigation property.')
        .nullable(),
      settingType: microsoft_graph_windowsSettingType,
      windowsDeviceId: z
        .string()
        .describe(
          'A unique identifier for the device the setting might belong to if it is of the settingType backup.'
        )
        .nullable(),
      instances: z
        .array(microsoft_graph_windowsSettingInstance)
        .describe('A collection of setting values for a given windowsSetting.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_userSettings = microsoft_graph_entity.and(
  z
    .object({
      contributionToContentDiscoveryAsOrganizationDisabled: z
        .boolean()
        .describe(
          "Reflects the organization level setting controlling delegate access to the trending API. When set to true, the organization doesn't have access to Office Delve. The relevancy of the content displayed in Microsoft 365, for example in Suggested sites in SharePoint Home and the Discover view in OneDrive for work or school is affected for the whole organization. This setting is read-only and can only be changed by administrators in the SharePoint admin center."
        ),
      contributionToContentDiscoveryDisabled: z
        .boolean()
        .describe(
          "When set to true, the delegate access to the user's trending API is disabled. When set to true, documents in the user's Office Delve are disabled. When set to true, the relevancy of the content displayed in Microsoft 365, for example in Suggested sites in SharePoint Home and the Discover view in OneDrive for work or school is affected. Users can control this setting in Office Delve."
        ),
      itemInsights: z
        .union([microsoft_graph_userInsightsSettings, z.object({}).partial().strict()])
        .describe(
          "The user's settings for the visibility of meeting hour insights, and insights derived between a user and other items in Microsoft 365, such as documents or sites. Get userInsightsSettings through this navigation property."
        ),
      shiftPreferences: z.union([
        microsoft_graph_shiftPreferences,
        z.object({}).partial().strict(),
      ]),
      storage: z.union([microsoft_graph_userStorage, z.object({}).partial().strict()]),
      windows: z.array(microsoft_graph_windowsSetting),
    })
    .partial()
    .strict()
);
const microsoft_graph_workingTimeSchedule = microsoft_graph_entity.and(
  z.object({}).partial().strict()
);
const microsoft_graph_userSolutionRoot = microsoft_graph_entity.and(
  z
    .object({
      workingTimeSchedule: z
        .union([microsoft_graph_workingTimeSchedule, z.object({}).partial().strict()])
        .describe('The working time schedule entity associated with the solution.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_associatedTeamInfo: z.ZodType<microsoft_graph_associatedTeamInfo> = z.lazy(
  () => microsoft_graph_teamInfo.and(z.object({}).partial().strict())
);
const microsoft_graph_userScopeTeamsAppInstallation = microsoft_graph_teamsAppInstallation.and(
  z
    .object({
      chat: z
        .union([microsoft_graph_chat, z.object({}).partial().strict()])
        .describe('The chat between the user and Teams app.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_userTeamwork: z.ZodType<microsoft_graph_userTeamwork> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        locale: z
          .string()
          .describe(
            "Represents the location that a user selected in Microsoft Teams and doesn't follow the Office's locale setting. A user's locale is represented by their preferred language and country or region. For example, en-us. The language component follows two-letter codes as defined in ISO 639-1, and the country component follows two-letter codes as defined in ISO 3166-1 alpha-2."
          )
          .nullable(),
        region: z
          .string()
          .describe(
            "Represents the region of the organization or the user. For users with multigeo licenses, the property contains the user's region (if available). For users without multigeo licenses, the property contains the organization's region.The region value can be any region supported by the Teams payload. The possible values are: Americas, Europe and MiddleEast, Asia Pacific, UAE, Australia, Brazil, Canada, Switzerland, Germany, France, India, Japan, South Korea, Norway, Singapore, United Kingdom, South Africa, Sweden, Qatar, Poland, Italy, Israel, Spain, Mexico, USGov Community Cloud, USGov Community Cloud High, USGov Department of Defense, and China."
          )
          .nullable(),
        associatedTeams: z
          .array(microsoft_graph_associatedTeamInfo)
          .describe('The list of associatedTeamInfo objects that a user is associated with.'),
        installedApps: z
          .array(microsoft_graph_userScopeTeamsAppInstallation)
          .describe('The apps installed in the personal scope of this user.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_wellknownListName = z.enum([
  'none',
  'defaultList',
  'flaggedEmails',
  'unknownFutureValue',
]);
const microsoft_graph_taskStatus = z.enum([
  'notStarted',
  'inProgress',
  'completed',
  'waitingOnOthers',
  'deferred',
]);
const microsoft_graph_attachmentBase = microsoft_graph_entity.and(
  z
    .object({
      contentType: z.string().describe('The MIME type.').nullable(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
        )
        .nullable(),
      name: z
        .string()
        .describe(
          "The display name of the attachment. This doesn't need to be the actual file name."
        )
        .nullable(),
      size: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The length of the attachment in bytes.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_attachmentSession = microsoft_graph_entity.and(
  z
    .object({
      content: z.string().describe('The content streams that are uploaded.').nullable(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time in UTC when the upload session will expire. The complete file must be uploaded before this expiration time is reached.'
        )
        .nullable(),
      nextExpectedRanges: z
        .array(z.string().nullable())
        .describe(
          'Indicates a single value {start} that represents the location in the file where the next upload should begin.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_checklistItem = microsoft_graph_entity.and(
  z
    .object({
      checkedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The date and time when the checklistItem was finished.')
        .nullable(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('The date and time when the checklistItem was created.'),
      displayName: z.string().describe('Indicates the title of the checklistItem.').nullable(),
      isChecked: z
        .boolean()
        .describe('State that indicates whether the item is checked off or not.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_linkedResource = microsoft_graph_entity.and(
  z
    .object({
      applicationName: z
        .string()
        .describe('The app name of the source that sends the linkedResource.')
        .nullable(),
      displayName: z.string().describe('The title of the linkedResource.').nullable(),
      externalId: z
        .string()
        .describe(
          'ID of the object that is associated with this task on the third-party/partner system.'
        )
        .nullable(),
      webUrl: z.string().describe('Deep link to the linkedResource.').nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_todoTask = microsoft_graph_entity.and(
  z
    .object({
      body: z
        .union([microsoft_graph_itemBody, z.object({}).partial().strict()])
        .describe('The task body that typically contains information about the task.'),
      bodyLastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "The date and time when the task body was last modified. By default, it is in UTC. You can provide a custom time zone in the request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2020 would look like this: '2020-01-01T00:00:00Z'."
        ),
      categories: z
        .array(z.string().nullable())
        .describe(
          'The categories associated with the task. Each category corresponds to the displayName property of an outlookCategory that the user has defined.'
        ),
      completedDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
        .describe('The date and time in the specified time zone that the task was finished.'),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "The date and time when the task was created. By default, it is in UTC. You can provide a custom time zone in the request header. The property value uses ISO 8601 format. For example, midnight UTC on Jan 1, 2020 would look like this: '2020-01-01T00:00:00Z'."
        ),
      dueDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
        .describe('The date and time in the specified time zone that the task is to be finished.'),
      hasAttachments: z
        .boolean()
        .describe('Indicates whether the task has attachments.')
        .nullable(),
      importance: microsoft_graph_importance,
      isReminderOn: z
        .boolean()
        .describe('Set to true if an alert is set to remind the user of the task.'),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "The date and time when the task was last modified. By default, it is in UTC. You can provide a custom time zone in the request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2020 would look like this: '2020-01-01T00:00:00Z'."
        ),
      recurrence: z
        .union([microsoft_graph_patternedRecurrence, z.object({}).partial().strict()])
        .describe('The recurrence pattern for the task.'),
      reminderDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
        .describe(
          'The date and time in the specified time zone for a reminder alert of the task to occur.'
        ),
      startDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().strict()])
        .describe(
          'The date and time in the specified time zone at which the task is scheduled to start.'
        ),
      status: microsoft_graph_taskStatus,
      title: z.string().describe('A brief description of the task.').nullable(),
      attachments: z
        .array(microsoft_graph_attachmentBase)
        .describe('A collection of file attachments for the task.'),
      attachmentSessions: z.array(microsoft_graph_attachmentSession),
      checklistItems: z
        .array(microsoft_graph_checklistItem)
        .describe('A collection of checklistItems linked to a task.'),
      extensions: z
        .array(microsoft_graph_extension)
        .describe('The collection of open extensions defined for the task. Nullable.'),
      linkedResources: z
        .array(microsoft_graph_linkedResource)
        .describe('A collection of resources linked to the task.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_todoTaskList = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().describe('The name of the task list.').nullable(),
      isOwner: z.boolean().describe('True if the user is owner of the given task list.'),
      isShared: z.boolean().describe('True if the task list is shared with other users'),
      wellknownListName: microsoft_graph_wellknownListName,
      extensions: z
        .array(microsoft_graph_extension)
        .describe('The collection of open extensions defined for the task list. Nullable.'),
      tasks: z
        .array(microsoft_graph_todoTask)
        .describe('The tasks in this task list. Read-only. Nullable.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_todo = microsoft_graph_entity.and(
  z
    .object({
      lists: z.array(microsoft_graph_todoTaskList).describe('The task lists in the users mailbox.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_user: z.ZodType<microsoft_graph_user> = z.lazy(() =>
  microsoft_graph_directoryObject.and(
    z
      .object({
        aboutMe: z
          .string()
          .describe(
            'A freeform text entry field for the user to describe themselves. Returned only on $select.'
          )
          .nullable(),
        accountEnabled: z
          .boolean()
          .describe(
            'true if the account is enabled; otherwise, false. This property is required when a user is created. Returned only on $select. Supports $filter (eq, ne, not, and in).'
          )
          .nullable(),
        ageGroup: z
          .string()
          .describe(
            'Sets the age group of the user. Allowed values: null, Minor, NotAdult, and Adult. For more information, see legal age group property definitions. Returned only on $select. Supports $filter (eq, ne, not, and in).'
          )
          .nullable(),
        assignedLicenses: z
          .array(microsoft_graph_assignedLicense)
          .describe(
            "The licenses that are assigned to the user, including inherited (group-based) licenses. This property doesn't differentiate between directly assigned and inherited licenses. Use the licenseAssignmentStates property to identify the directly assigned and inherited licenses. Not nullable. Returned only on $select. Supports $filter (eq, not, /$count eq 0, /$count ne 0)."
          ),
        assignedPlans: z
          .array(microsoft_graph_assignedPlan)
          .describe(
            'The plans that are assigned to the user. Read-only. Not nullable. Returned only on $select. Supports $filter (eq and not).'
          ),
        authorizationInfo: z.union([
          microsoft_graph_authorizationInfo,
          z.object({}).partial().strict(),
        ]),
        birthday: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The birthday of the user. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014, is 2014-01-01T00:00:00Z. Returned only on $select.'
          ),
        businessPhones: z
          .array(z.string())
          .describe(
            "The telephone numbers for the user. NOTE: Although it's a string collection, only one number can be set for this property. Read-only for users synced from the on-premises directory. Returned by default. Supports $filter (eq, not, ge, le, startsWith)."
          ),
        city: z
          .string()
          .describe(
            'The city where the user is located. Maximum length is 128 characters. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        companyName: z
          .string()
          .describe(
            'The name of the company that the user is associated with. This property can be useful for describing the company that a guest comes from. The maximum length is 64 characters.Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        consentProvidedForMinor: z
          .string()
          .describe(
            'Sets whether consent was obtained for minors. Allowed values: null, Granted, Denied, and NotRequired. For more information, see legal age group property definitions. Returned only on $select. Supports $filter (eq, ne, not, and in).'
          )
          .nullable(),
        country: z
          .string()
          .describe(
            'The country or region where the user is located; for example, US or UK. Maximum length is 128 characters. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            "The date and time the user was created, in ISO 8601 format and UTC. The value can't be modified and is automatically populated when the entity is created. Nullable. For on-premises users, the value represents when they were first created in Microsoft Entra ID. Property is null for some users created before June 2018 and on-premises users that were synced to Microsoft Entra ID before June 2018. Read-only. Returned only on $select. Supports $filter (eq, ne, not , ge, le, in)."
          )
          .nullable(),
        creationType: z
          .string()
          .describe(
            'Indicates whether the user account was created through one of the following methods:  As a regular school or work account (null). As an external account (Invitation). As a local account for an Azure Active Directory B2C tenant (LocalAccount). Through self-service sign-up by an internal user using email verification (EmailVerified). Through self-service sign-up by a guest signing up through a link that is part of a user flow (SelfServiceSignUp). Read-only.Returned only on $select. Supports $filter (eq, ne, not, in).'
          )
          .nullable(),
        customSecurityAttributes: z
          .union([microsoft_graph_customSecurityAttributeValue, z.object({}).partial().strict()])
          .describe(
            'An open complex type that holds the value of a custom security attribute that is assigned to a directory object. Nullable. Returned only on $select. Supports $filter (eq, ne, not, startsWith). The filter value is case-sensitive. To read this property, the calling app must be assigned the CustomSecAttributeAssignment.Read.All permission. To write this property, the calling app must be assigned the CustomSecAttributeAssignment.ReadWrite.All permissions. To read or write this property in delegated scenarios, the admin must be assigned the Attribute Assignment Administrator role.'
          ),
        department: z
          .string()
          .describe(
            'The name of the department in which the user works. Maximum length is 64 characters. Returned only on $select. Supports $filter (eq, ne, not , ge, le, in, and eq on null values).'
          )
          .nullable(),
        deviceEnrollmentLimit: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe(
            'The limit on the maximum number of devices that the user is permitted to enroll. Allowed values are 5 or 1000.'
          ),
        displayName: z
          .string()
          .describe(
            "The name displayed in the address book for the user. This value is usually the combination of the user's first name, middle initial, and family name. This property is required when a user is created and it can't be cleared during updates. Maximum length is 256 characters. Returned by default. Supports $filter (eq, ne, not , ge, le, in, startsWith, and eq on null values), $orderby, and $search."
          )
          .nullable(),
        employeeHireDate: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The date and time when the user was hired or will start work in a future hire. Returned only on $select. Supports $filter (eq, ne, not , ge, le, in).'
          )
          .nullable(),
        employeeId: z
          .string()
          .describe(
            'The employee identifier assigned to the user by the organization. The maximum length is 16 characters. Returned only on $select. Supports $filter (eq, ne, not , ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        employeeLeaveDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The date and time when the user left or will leave the organization. To read this property, the calling app must be assigned the User-LifeCycleInfo.Read.All permission. To write this property, the calling app must be assigned the User.Read.All and User-LifeCycleInfo.ReadWrite.All permissions. To read this property in delegated scenarios, the admin needs at least one of the following Microsoft Entra roles: Lifecycle Workflows Administrator (least privilege), Global Reader. To write this property in delegated scenarios, the admin needs the Global Administrator role. Supports $filter (eq, ne, not , ge, le, in). For more information, see Configure the employeeLeaveDateTime property for a user.'
          )
          .nullable(),
        employeeOrgData: z
          .union([microsoft_graph_employeeOrgData, z.object({}).partial().strict()])
          .describe(
            'Represents organization data (for example, division and costCenter) associated with a user. Returned only on $select. Supports $filter (eq, ne, not , ge, le, in).'
          ),
        employeeType: z
          .string()
          .describe(
            'Captures enterprise worker type. For example, Employee, Contractor, Consultant, or Vendor. Returned only on $select. Supports $filter (eq, ne, not , ge, le, in, startsWith).'
          )
          .nullable(),
        externalUserState: z
          .string()
          .describe(
            "For a guest invited to the tenant using the invitation API, this property represents the invited user's invitation status. For invited users, the state can be PendingAcceptance or Accepted, or null for all other users. Returned only on $select. Supports $filter (eq, ne, not , in)."
          )
          .nullable(),
        externalUserStateChangeDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Shows the timestamp for the latest change to the externalUserState property. Returned only on $select. Supports $filter (eq, ne, not , in).'
          )
          .nullable(),
        faxNumber: z
          .string()
          .describe(
            'The fax number of the user. Returned only on $select. Supports $filter (eq, ne, not , ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        givenName: z
          .string()
          .describe(
            'The given name (first name) of the user. Maximum length is 64 characters. Returned by default. Supports $filter (eq, ne, not , ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        hireDate: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The hire date of the user. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014, is 2014-01-01T00:00:00Z. Returned only on $select.  Note: This property is specific to SharePoint in Microsoft 365. We recommend using the native employeeHireDate property to set and update hire date values using Microsoft Graph APIs.'
          ),
        identities: z
          .array(microsoft_graph_objectIdentity)
          .describe(
            'Represents the identities that can be used to sign in to this user account. Microsoft (also known as a local account), organizations, or social identity providers such as Facebook, Google, and Microsoft can provide identity and tie it to a user account. It might contain multiple items with the same signInType value. Returned only on $select.  Supports $filter (eq) with limitations.'
          ),
        imAddresses: z
          .array(z.string().nullable())
          .describe(
            'The instant message voice-over IP (VOIP) session initiation protocol (SIP) addresses for the user. Read-only. Returned only on $select. Supports $filter (eq, not, ge, le, startsWith).'
          ),
        interests: z
          .array(z.string().nullable())
          .describe('A list for the user to describe their interests. Returned only on $select.'),
        isManagementRestricted: z.boolean().nullable(),
        isResourceAccount: z.boolean().describe("Don't use – reserved for future use.").nullable(),
        jobTitle: z
          .string()
          .describe(
            "The user's job title. Maximum length is 128 characters. Returned by default. Supports $filter (eq, ne, not , ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        lastPasswordChangeDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'The time when this Microsoft Entra user last changed their password or when their password was created, whichever date the latest action was performed. The date and time information uses ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Returned only on $select.'
          )
          .nullable(),
        legalAgeGroupClassification: z
          .string()
          .describe(
            'Used by enterprise applications to determine the legal age group of the user. This property is read-only and calculated based on ageGroup and consentProvidedForMinor properties. Allowed values: null, Undefined,  MinorWithOutParentalConsent, MinorWithParentalConsent, MinorNoParentalConsentRequired, NotAdult, and Adult. For more information, see legal age group property definitions. Returned only on $select.'
          )
          .nullable(),
        licenseAssignmentStates: z
          .array(microsoft_graph_licenseAssignmentState)
          .describe(
            'State of license assignments for this user. Also indicates licenses that are directly assigned or the user inherited through group memberships. Read-only. Returned only on $select.'
          ),
        mail: z
          .string()
          .describe(
            "The SMTP address for the user, for example, jeff@contoso.com. Changes to this property update the user's proxyAddresses collection to include the value as an SMTP address. This property can't contain accent characters.  NOTE: We don't recommend updating this property for Azure AD B2C user profiles. Use the otherMails property instead. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, endsWith, and eq on null values)."
          )
          .nullable(),
        mailboxSettings: z
          .union([microsoft_graph_mailboxSettings, z.object({}).partial().strict()])
          .describe(
            'Settings for the primary mailbox of the signed-in user. You can get or update settings for sending automatic replies to incoming messages, locale, and time zone. Returned only on $select.'
          ),
        mailNickname: z
          .string()
          .describe(
            'The mail alias for the user. This property must be specified when a user is created. Maximum length is 64 characters. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        mobilePhone: z
          .string()
          .describe(
            'The primary cellular telephone number for the user. Read-only for users synced from the on-premises directory. Maximum length is 64 characters. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values) and $search.'
          )
          .nullable(),
        mySite: z
          .string()
          .describe("The URL for the user's site. Returned only on $select.")
          .nullable(),
        officeLocation: z
          .string()
          .describe(
            "The office location in the user's place of business. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        onPremisesDistinguishedName: z
          .string()
          .describe(
            'Contains the on-premises Active Directory distinguished name or DN. The property is only populated for customers who are synchronizing their on-premises directory to Microsoft Entra ID via Microsoft Entra Connect. Read-only. Returned only on $select.'
          )
          .nullable(),
        onPremisesDomainName: z
          .string()
          .describe(
            'Contains the on-premises domainFQDN, also called dnsDomainName synchronized from the on-premises directory. The property is only populated for customers who are synchronizing their on-premises directory to Microsoft Entra ID via Microsoft Entra Connect. Read-only. Returned only on $select.'
          )
          .nullable(),
        onPremisesExtensionAttributes: z
          .union([microsoft_graph_onPremisesExtensionAttributes, z.object({}).partial().strict()])
          .describe(
            'Contains extensionAttributes1-15 for the user. These extension attributes are also known as Exchange custom attributes 1-15. Each attribute can store up to 1024 characters. For an onPremisesSyncEnabled user, the source of authority for this set of properties is the on-premises and is read-only. For a cloud-only user (where onPremisesSyncEnabled is false), these properties can be set during the creation or update of a user object.  For a cloud-only user previously synced from on-premises Active Directory, these properties are read-only in Microsoft Graph but can be fully managed through the Exchange Admin Center or the Exchange Online V2 module in PowerShell. Returned only on $select. Supports $filter (eq, ne, not, in).'
          ),
        onPremisesImmutableId: z
          .string()
          .describe(
            "This property is used to associate an on-premises Active Directory user account to their Microsoft Entra user object. This property must be specified when creating a new user account in the Graph if you're using a federated domain for the user's userPrincipalName (UPN) property. NOTE: The $ and _ characters can't be used when specifying this property. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in)."
          )
          .nullable(),
        onPremisesLastSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Indicates the last time at which the object was synced with the on-premises directory; for example: 2013-02-16T03:04:54Z. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in).'
          )
          .nullable(),
        onPremisesProvisioningErrors: z
          .array(microsoft_graph_onPremisesProvisioningError)
          .describe(
            'Errors when using Microsoft synchronization product during provisioning. Returned only on $select. Supports $filter (eq, not, ge, le).'
          ),
        onPremisesSamAccountName: z
          .string()
          .describe(
            'Contains the on-premises samAccountName synchronized from the on-premises directory. The property is only populated for customers who are synchronizing their on-premises directory to Microsoft Entra ID via Microsoft Entra Connect. Read-only. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith).'
          )
          .nullable(),
        onPremisesSecurityIdentifier: z
          .string()
          .describe(
            'Contains the on-premises security identifier (SID) for the user that was synchronized from on-premises to the cloud. Read-only. Returned only on $select. Supports $filter (eq including on null values).'
          )
          .nullable(),
        onPremisesSyncEnabled: z
          .boolean()
          .describe(
            "true if this user object is currently being synced from an on-premises Active Directory (AD); otherwise the user isn't being synced and can be managed in Microsoft Entra ID. Read-only. Returned only on $select. Supports $filter (eq, ne, not, in, and eq on null values)."
          )
          .nullable(),
        onPremisesUserPrincipalName: z
          .string()
          .describe(
            'Contains the on-premises userPrincipalName synchronized from the on-premises directory. The property is only populated for customers who are synchronizing their on-premises directory to Microsoft Entra ID via Microsoft Entra Connect. Read-only. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith).'
          )
          .nullable(),
        otherMails: z
          .array(z.string())
          .describe(
            "A list of other email addresses for the user; for example: ['bob@contoso.com', 'Robert@fabrikam.com']. Can store up to 250 values, each with a limit of 250 characters. NOTE: This property can't contain accent characters. Returned only on $select. Supports $filter (eq, not, ge, le, in, startsWith, endsWith, /$count eq 0, /$count ne 0)."
          ),
        passwordPolicies: z
          .string()
          .describe(
            'Specifies password policies for the user. This value is an enumeration with one possible value being DisableStrongPassword, which allows weaker passwords than the default policy to be specified. DisablePasswordExpiration can also be specified. The two might be specified together; for example: DisablePasswordExpiration, DisableStrongPassword. Returned only on $select. For more information on the default password policies, see Microsoft Entra password policies. Supports $filter (ne, not, and eq on null values).'
          )
          .nullable(),
        passwordProfile: z
          .union([microsoft_graph_passwordProfile, z.object({}).partial().strict()])
          .describe(
            "Specifies the password profile for the user. The profile contains the user's password. This property is required when a user is created. The password in the profile must satisfy minimum requirements as specified by the passwordPolicies property. By default, a strong password is required. Returned only on $select. Supports $filter (eq, ne, not, in, and eq on null values). To update this property:  User-PasswordProfile.ReadWrite.All is the least privileged permission to update this property.  In delegated scenarios, the User Administrator Microsoft Entra role is the least privileged admin role supported to update this property for nonadmin users. Privileged Authentication Administrator is the least privileged role that's allowed to update this property for all administrators in the tenant. In general, the signed-in user must have a higher privileged administrator role as indicated in Who can reset passwords.  In app-only scenarios, the calling app must be assigned a supported permission and at least the User Administrator Microsoft Entra role."
          ),
        pastProjects: z
          .array(z.string().nullable())
          .describe(
            'A list for the user to enumerate their past projects. Returned only on $select.'
          ),
        postalCode: z
          .string()
          .describe(
            "The postal code for the user's postal address. The postal code is specific to the user's country or region. In the United States of America, this attribute contains the ZIP code. Maximum length is 40 characters. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        preferredDataLocation: z
          .string()
          .describe(
            'The preferred data location for the user. For more information, see OneDrive Online Multi-Geo.'
          )
          .nullable(),
        preferredLanguage: z
          .string()
          .describe(
            "The preferred language for the user. The preferred language format is based on RFC 4646. The name is a combination of an ISO 639 two-letter lowercase culture code associated with the language, and an ISO 3166 two-letter uppercase subculture code associated with the country or region. Example: 'en-US', or 'es-ES'. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)"
          )
          .nullable(),
        preferredName: z
          .string()
          .describe(
            'The preferred name for the user. Not Supported. This attribute returns an empty string.Returned only on $select.'
          )
          .nullable(),
        print: z.union([microsoft_graph_userPrint, z.object({}).partial().strict()]),
        provisionedPlans: z
          .array(microsoft_graph_provisionedPlan)
          .describe(
            'The plans that are provisioned for the user. Read-only. Not nullable. Returned only on $select. Supports $filter (eq, not, ge, le).'
          ),
        proxyAddresses: z
          .array(z.string())
          .describe(
            "For example: ['SMTP: bob@contoso.com', 'smtp: bob@sales.contoso.com']. Changes to the mail property update this collection to include the value as an SMTP address. For more information, see mail and proxyAddresses properties. The proxy address prefixed with SMTP (capitalized) is the primary proxy address, while those addresses prefixed with smtp are the secondary proxy addresses. For Azure AD B2C accounts, this property has a limit of 10 unique addresses. Read-only in Microsoft Graph; you can update this property only through the Microsoft 365 admin center. Not nullable. Returned only on $select. Supports $filter (eq, not, ge, le, startsWith, endsWith, /$count eq 0, /$count ne 0)."
          ),
        responsibilities: z
          .array(z.string().nullable())
          .describe(
            'A list for the user to enumerate their responsibilities. Returned only on $select.'
          ),
        schools: z
          .array(z.string().nullable())
          .describe(
            'A list for the user to enumerate the schools they attended. Returned only on $select.'
          ),
        securityIdentifier: z
          .string()
          .describe(
            'Security identifier (SID) of the user, used in Windows scenarios. Read-only. Returned by default. Supports $select and $filter (eq, not, ge, le, startsWith).'
          )
          .nullable(),
        serviceProvisioningErrors: z
          .array(microsoft_graph_serviceProvisioningError)
          .describe(
            'Errors published by a federated service describing a nontransient, service-specific error regarding the properties or link from a user object.  Supports $filter (eq, not, for isResolved and serviceInstance).'
          ),
        showInAddressList: z
          .boolean()
          .describe(
            'Do not use in Microsoft Graph. Manage this property through the Microsoft 365 admin center instead. Represents whether the user should be included in the Outlook global address list. See Known issue.'
          )
          .nullable(),
        signInActivity: z
          .union([microsoft_graph_signInActivity, z.object({}).partial().strict()])
          .describe(
            "Get the last signed-in date and request ID of the sign-in for a given user. Read-only.Returned only on $select. Supports $filter (eq, ne, not, ge, le) but not with any other filterable properties. Note: Details for this property require a Microsoft Entra ID P1 or P2 license and the AuditLog.Read.All permission.This property isn't returned for a user who never signed in or last signed in before April 2020."
          ),
        signInSessionsValidFromDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe(
            'Any refresh tokens or session tokens (session cookies) issued before this time are invalid. Applications get an error when using an invalid refresh or session token to acquire a delegated access token (to access APIs such as Microsoft Graph). If this happens, the application needs to acquire a new refresh token by requesting the authorized endpoint. Read-only. Use revokeSignInSessions to reset. Returned only on $select.'
          )
          .nullable(),
        skills: z
          .array(z.string().nullable())
          .describe('A list for the user to enumerate their skills. Returned only on $select.'),
        state: z
          .string()
          .describe(
            "The state or province in the user's address. Maximum length is 128 characters. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        streetAddress: z
          .string()
          .describe(
            "The street address of the user's place of business. Maximum length is 1,024 characters. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        surname: z
          .string()
          .describe(
            "The user's surname (family name or last name). Maximum length is 64 characters. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
          )
          .nullable(),
        usageLocation: z
          .string()
          .describe(
            'A two-letter country code (ISO standard 3166). Required for users that are assigned licenses due to legal requirements to check for availability of services in countries/regions. Examples include: US, JP, and GB. Not nullable. Returned only on $select. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
          )
          .nullable(),
        userPrincipalName: z
          .string()
          .describe(
            "The user principal name (UPN) of the user. The UPN is an Internet-style sign-in name for the user based on the Internet standard RFC 822. By convention, this value should map to the user's email name. The general format is alias@domain, where the domain must be present in the tenant's collection of verified domains. This property is required when a user is created. The verified domains for the tenant can be accessed from the verifiedDomains property of organization.NOTE: This property can't contain accent characters. Only the following characters are allowed A - Z, a - z, 0 - 9, ' . - _ ! # ^ ~. For the complete list of allowed characters, see username policies. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, endsWith) and $orderby."
          )
          .nullable(),
        userType: z
          .string()
          .describe(
            'A string value that can be used to classify user types in your directory. The possible values are Member and Guest. Returned only on $select. Supports $filter (eq, ne, not, in, and eq on null values). NOTE: For more information about the permissions for members and guests, see What are the default user permissions in Microsoft Entra ID?'
          )
          .nullable(),
        activities: z
          .array(microsoft_graph_userActivity)
          .describe("The user's activities across devices. Read-only. Nullable."),
        agreementAcceptances: z
          .array(microsoft_graph_agreementAcceptance)
          .describe("The user's terms of use acceptance statuses. Read-only. Nullable."),
        appRoleAssignments: z
          .array(microsoft_graph_appRoleAssignment)
          .describe(
            'Represents the app roles a user is granted for an application. Supports $expand.'
          ),
        authentication: z
          .union([microsoft_graph_authentication, z.object({}).partial().strict()])
          .describe('The authentication methods that are supported for the user.'),
        calendar: z
          .union([microsoft_graph_calendar, z.object({}).partial().strict()])
          .describe("The user's primary calendar. Read-only."),
        calendarGroups: z
          .array(microsoft_graph_calendarGroup)
          .describe("The user's calendar groups. Read-only. Nullable."),
        calendars: z
          .array(microsoft_graph_calendar)
          .describe("The user's calendars. Read-only. Nullable."),
        calendarView: z
          .array(microsoft_graph_event)
          .describe('The calendar view for the calendar. Read-only. Nullable.'),
        chats: z.array(microsoft_graph_chat),
        cloudClipboard: z.union([
          microsoft_graph_cloudClipboardRoot,
          z.object({}).partial().strict(),
        ]),
        contactFolders: z
          .array(microsoft_graph_contactFolder)
          .describe("The user's contacts folders. Read-only. Nullable."),
        contacts: z
          .array(microsoft_graph_contact)
          .describe("The user's contacts. Read-only. Nullable."),
        createdObjects: z
          .array(microsoft_graph_directoryObject)
          .describe('Directory objects that the user created. Read-only. Nullable.'),
        deviceManagementTroubleshootingEvents: z
          .array(microsoft_graph_deviceManagementTroubleshootingEvent)
          .describe('The list of troubleshooting events for this user.'),
        directReports: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'The users and contacts that report to the user. (The users and contacts that have their manager property set to this user.) Read-only. Nullable. Supports $expand.'
          ),
        drive: z
          .union([microsoft_graph_drive, z.object({}).partial().strict()])
          .describe("The user's OneDrive. Read-only."),
        drives: z
          .array(microsoft_graph_drive)
          .describe('A collection of drives available for this user. Read-only.'),
        employeeExperience: z.union([
          microsoft_graph_employeeExperienceUser,
          z.object({}).partial().strict(),
        ]),
        events: z
          .array(microsoft_graph_event)
          .describe(
            "The user's events. Default is to show Events under the Default Calendar. Read-only. Nullable."
          ),
        extensions: z
          .array(microsoft_graph_extension)
          .describe(
            'The collection of open extensions defined for the user. Read-only. Supports $expand. Nullable.'
          ),
        followedSites: z.array(microsoft_graph_site),
        inferenceClassification: z
          .union([microsoft_graph_inferenceClassification, z.object({}).partial().strict()])
          .describe(
            "Relevance classification of the user's messages based on explicit designations that override inferred relevance or importance."
          ),
        insights: z
          .union([microsoft_graph_itemInsights, z.object({}).partial().strict()])
          .describe(
            'Represents relationships between a user and items such as OneDrive for work or school documents, calculated using advanced analytics and machine learning techniques. Read-only. Nullable.'
          ),
        joinedTeams: z.array(microsoft_graph_team),
        licenseDetails: z
          .array(microsoft_graph_licenseDetails)
          .describe("A collection of this user's license details. Read-only."),
        mailFolders: z
          .array(microsoft_graph_mailFolder)
          .describe("The user's mail folders. Read-only. Nullable."),
        managedAppRegistrations: z
          .array(microsoft_graph_managedAppRegistration)
          .describe('Zero or more managed app registrations that belong to the user.'),
        managedDevices: z
          .array(microsoft_graph_managedDevice)
          .describe('The managed devices associated with the user.'),
        manager: z
          .union([microsoft_graph_directoryObject, z.object({}).partial().strict()])
          .describe(
            "The user or contact that is this user's manager. Read-only. Supports $expand."
          ),
        memberOf: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'The groups and directory roles that the user is a member of. Read-only. Nullable. Supports $expand.'
          ),
        messages: z
          .array(microsoft_graph_message)
          .describe('The messages in a mailbox or folder. Read-only. Nullable.'),
        oauth2PermissionGrants: z.array(microsoft_graph_oAuth2PermissionGrant),
        onenote: z.union([microsoft_graph_onenote, z.object({}).partial().strict()]),
        onlineMeetings: z
          .array(microsoft_graph_onlineMeeting)
          .describe(
            'Information about a meeting, including the URL used to join a meeting, the attendees list, and the description.'
          ),
        outlook: z.union([microsoft_graph_outlookUser, z.object({}).partial().strict()]),
        ownedDevices: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'Devices the user owns. Read-only. Nullable. Supports $expand and $filter (/$count eq 0, /$count ne 0, /$count eq 1, /$count ne 1).'
          ),
        ownedObjects: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'Directory objects the user owns. Read-only. Nullable. Supports $expand, $select nested in $expand, and $filter (/$count eq 0, /$count ne 0, /$count eq 1, /$count ne 1).'
          ),
        people: z
          .array(microsoft_graph_person)
          .describe('People that are relevant to the user. Read-only. Nullable.'),
        permissionGrants: z
          .array(microsoft_graph_resourceSpecificPermissionGrant)
          .describe('List all resource-specific permission grants of a user.'),
        photo: z
          .union([microsoft_graph_profilePhoto, z.object({}).partial().strict()])
          .describe("The user's profile photo. Read-only."),
        photos: z
          .array(microsoft_graph_profilePhoto)
          .describe("The collection of the user's profile photos in different sizes. Read-only."),
        planner: z
          .union([microsoft_graph_plannerUser, z.object({}).partial().strict()])
          .describe('Entry-point to the Planner resource that might exist for a user. Read-only.'),
        presence: z.union([microsoft_graph_presence, z.object({}).partial().strict()]),
        registeredDevices: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'Devices that are registered for the user. Read-only. Nullable. Supports $expand and returns up to 100 objects.'
          ),
        scopedRoleMemberOf: z.array(microsoft_graph_scopedRoleMembership),
        settings: z.union([microsoft_graph_userSettings, z.object({}).partial().strict()]),
        solutions: z
          .union([microsoft_graph_userSolutionRoot, z.object({}).partial().strict()])
          .describe(
            'The identifier that relates the user to the working time schedule triggers. Read-Only. Nullable'
          ),
        sponsors: z
          .array(microsoft_graph_directoryObject)
          .describe(
            "The users and groups responsible for this guest's privileges in the tenant and keeping the guest's information and access updated. (HTTP Methods: GET, POST, DELETE.). Supports $expand."
          ),
        teamwork: z
          .union([microsoft_graph_userTeamwork, z.object({}).partial().strict()])
          .describe(
            'A container for Microsoft Teams features available for the user. Read-only. Nullable.'
          ),
        todo: z
          .union([microsoft_graph_todo, z.object({}).partial().strict()])
          .describe('Represents the To Do services available to a user.'),
        transitiveMemberOf: z
          .array(microsoft_graph_directoryObject)
          .describe(
            'The groups, including nested groups, and directory roles that a user is a member of. Nullable.'
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_baseItem: z.ZodType<microsoft_graph_baseItem> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        createdBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
          .describe(
            'Identity of the user, device, or application that created the item. Read-only.'
          ),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Date and time of item creation. Read-only.'),
        description: z
          .string()
          .describe('Provides a user-visible description of the item. Optional.')
          .nullable(),
        eTag: z.string().describe('ETag for the item. Read-only.').nullable(),
        lastModifiedBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
          .describe(
            'Identity of the user, device, and application that last modified the item. Read-only.'
          ),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .describe('Date and time the item was last modified. Read-only.'),
        name: z.string().describe('The name of the item. Read-write.').nullable(),
        parentReference: z
          .union([microsoft_graph_itemReference, z.object({}).partial().strict()])
          .describe('Parent information, if the item has a parent. Read-write.'),
        webUrl: z
          .string()
          .describe(
            'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
          )
          .nullable(),
        createdByUser: z
          .union([microsoft_graph_user, z.object({}).partial().strict()])
          .describe('Identity of the user who created the item. Read-only.'),
        lastModifiedByUser: z
          .union([microsoft_graph_user, z.object({}).partial().strict()])
          .describe('Identity of the user who last modified the item. Read-only.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_audio = z
  .object({
    album: z.string().describe('The title of the album for this audio file.').nullable(),
    albumArtist: z
      .string()
      .describe('The artist named on the album for the audio file.')
      .nullable(),
    artist: z.string().describe('The performing artist for the audio file.').nullable(),
    bitrate: z.number().describe('Bitrate expressed in kbps.').nullable(),
    composers: z.string().describe('The name of the composer of the audio file.').nullable(),
    copyright: z.string().describe('Copyright information for the audio file.').nullable(),
    disc: z
      .number()
      .gte(-32768)
      .lte(32767)
      .describe('The number of the disc this audio file came from.')
      .nullable(),
    discCount: z
      .number()
      .gte(-32768)
      .lte(32767)
      .describe('The total number of discs in this album.')
      .nullable(),
    duration: z
      .number()
      .describe('Duration of the audio file, expressed in milliseconds')
      .nullable(),
    genre: z.string().describe('The genre of this audio file.').nullable(),
    hasDrm: z
      .boolean()
      .describe('Indicates if the file is protected with digital rights management.')
      .nullable(),
    isVariableBitrate: z
      .boolean()
      .describe('Indicates if the file is encoded with a variable bitrate.')
      .nullable(),
    title: z.string().describe('The title of the audio file.').nullable(),
    track: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of the track on the original disc for this audio file.')
      .nullable(),
    trackCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The total number of tracks on the original disc for this audio file.')
      .nullable(),
    year: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The year the audio file was recorded.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_album = z
  .object({
    coverImageItemId: z
      .string()
      .describe('Unique identifier of the driveItem that is the cover of the album.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_bundle = z
  .object({
    album: z
      .union([microsoft_graph_album, z.object({}).partial().strict()])
      .describe('If the bundle is an album, then the album property is included'),
    childCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of children contained immediately within this container.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_deleted = z
  .object({ state: z.string().describe('Represents the state of the deleted item.').nullable() })
  .partial()
  .strict();
const microsoft_graph_hashes = z
  .object({
    crc32Hash: z
      .string()
      .describe('The CRC32 value of the file (if available). Read-only.')
      .nullable(),
    quickXorHash: z
      .string()
      .describe(
        'A proprietary hash of the file that can be used to determine if the contents of the file change (if available). Read-only.'
      )
      .nullable(),
    sha1Hash: z
      .string()
      .describe('SHA1 hash for the contents of the file (if available). Read-only.')
      .nullable(),
    sha256Hash: z.string().describe("This property isn't supported. Don't use.").nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_file = z
  .object({
    hashes: z
      .union([microsoft_graph_hashes, z.object({}).partial().strict()])
      .describe("Hashes of the file's binary content, if available. Read-only."),
    mimeType: z
      .string()
      .describe(
        'The MIME type for the file. This is determined by logic on the server and might not be the value provided when the file was uploaded. Read-only.'
      )
      .nullable(),
    processingMetadata: z.boolean().nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_fileSystemInfo = z
  .object({
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The UTC date and time the file was created on a client.')
      .nullable(),
    lastAccessedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The UTC date and time the file was last accessed. Available for the recent file list only.'
      )
      .nullable(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The UTC date and time the file was last modified on a client.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_folderView = z
  .object({
    sortBy: z.string().describe('The method by which the folder should be sorted.').nullable(),
    sortOrder: z
      .string()
      .describe(
        'If true, indicates that items should be sorted in descending order. Otherwise, items should be sorted ascending.'
      )
      .nullable(),
    viewType: z
      .string()
      .describe('The type of view that should be used to represent the folder.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_folder = z
  .object({
    childCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of children contained immediately within this container.')
      .nullable(),
    view: z
      .union([microsoft_graph_folderView, z.object({}).partial().strict()])
      .describe('A collection of properties defining the recommended view for the folder.'),
  })
  .partial()
  .strict();
const microsoft_graph_image = z
  .object({
    height: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Optional. Height of the image, in pixels. Read-only.')
      .nullable(),
    width: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Optional. Width of the image, in pixels. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_malware = z
  .object({
    description: z
      .string()
      .describe('Contains the virus details for the malware facet.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_package = z
  .object({
    type: z
      .string()
      .describe(
        'A string indicating the type of package. While oneNote is the only currently defined value, you should expect other package types to be returned and handle them accordingly.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_pendingContentUpdate = z
  .object({
    queuedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the pending binary operation was queued in UTC time. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_pendingOperations = z
  .object({
    pendingContentUpdate: z
      .union([microsoft_graph_pendingContentUpdate, z.object({}).partial().strict()])
      .describe(
        'A property that indicates that an operation that might update the binary content of a file is pending completion.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_photo = z
  .object({
    cameraMake: z.string().describe('Camera manufacturer. Read-only.').nullable(),
    cameraModel: z.string().describe('Camera model. Read-only.').nullable(),
    exposureDenominator: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The denominator for the exposure time fraction from the camera. Read-only.'),
    exposureNumerator: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The numerator for the exposure time fraction from the camera. Read-only.'),
    fNumber: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The F-stop value from the camera. Read-only.'),
    focalLength: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('The focal length from the camera. Read-only.'),
    iso: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The ISO value from the camera. Read-only.')
      .nullable(),
    orientation: z
      .number()
      .gte(-32768)
      .lte(32767)
      .describe('The orientation value from the camera. Writable on OneDrive Personal.')
      .nullable(),
    takenDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Represents the date and time the photo was taken. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_shared = z
  .object({
    owner: z
      .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
      .describe('The identity of the owner of the shared item. Read-only.'),
    scope: z
      .string()
      .describe(
        'Indicates the scope of how the item is shared. The possible values are: anonymous, organization, or users. Read-only.'
      )
      .nullable(),
    sharedBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
      .describe('The identity of the user who shared the item. Read-only.'),
    sharedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The UTC date and time when the item was shared. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_specialFolder = z
  .object({
    name: z
      .string()
      .describe('The unique identifier for this item in the /drive/special collection')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_video = z
  .object({
    audioBitsPerSample: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of audio bits per sample.')
      .nullable(),
    audioChannels: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of audio channels.')
      .nullable(),
    audioFormat: z.string().describe('Name of the audio format (AAC, MP3, etc.).').nullable(),
    audioSamplesPerSecond: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of audio samples per second.')
      .nullable(),
    bitrate: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Bit rate of the video in bits per second.')
      .nullable(),
    duration: z.number().describe('Duration of the file in milliseconds.').nullable(),
    fourCC: z.string().describe("'Four character code' name of the video format.").nullable(),
    frameRate: z
      .union([z.number(), z.string(), ReferenceNumeric])
      .describe('Frame rate of the video.'),
    height: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Height of the video, in pixels.')
      .nullable(),
    width: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Width of the video, in pixels.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_remoteItem = z
  .object({
    createdBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
      .describe('Identity of the user, device, and application which created the item. Read-only.'),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time of item creation. Read-only.')
      .nullable(),
    file: z
      .union([microsoft_graph_file, z.object({}).partial().strict()])
      .describe('Indicates that the remote item is a file. Read-only.'),
    fileSystemInfo: z
      .union([microsoft_graph_fileSystemInfo, z.object({}).partial().strict()])
      .describe('Information about the remote item from the local file system. Read-only.'),
    folder: z
      .union([microsoft_graph_folder, z.object({}).partial().strict()])
      .describe('Indicates that the remote item is a folder. Read-only.'),
    id: z
      .string()
      .describe('Unique identifier for the remote item in its drive. Read-only.')
      .nullable(),
    image: z
      .union([microsoft_graph_image, z.object({}).partial().strict()])
      .describe('Image metadata, if the item is an image. Read-only.'),
    lastModifiedBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
      .describe(
        'Identity of the user, device, and application which last modified the item. Read-only.'
      ),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the item was last modified. Read-only.')
      .nullable(),
    name: z.string().describe('Optional. Filename of the remote item. Read-only.').nullable(),
    package: z
      .union([microsoft_graph_package, z.object({}).partial().strict()])
      .describe(
        'If present, indicates that this item is a package instead of a folder or file. Packages are treated like files in some contexts and folders in others. Read-only.'
      ),
    parentReference: z
      .union([microsoft_graph_itemReference, z.object({}).partial().strict()])
      .describe('Properties of the parent of the remote item. Read-only.'),
    shared: z
      .union([microsoft_graph_shared, z.object({}).partial().strict()])
      .describe(
        'Indicates that the item has been shared with others and provides information about the shared state of the item. Read-only.'
      ),
    sharepointIds: z
      .union([microsoft_graph_sharepointIds, z.object({}).partial().strict()])
      .describe(
        'Provides interop between items in OneDrive for Business and SharePoint with the full set of item identifiers. Read-only.'
      ),
    size: z.number().describe('Size of the remote item. Read-only.').nullable(),
    specialFolder: z
      .union([microsoft_graph_specialFolder, z.object({}).partial().strict()])
      .describe(
        'If the current item is also available as a special folder, this facet is returned. Read-only.'
      ),
    video: z
      .union([microsoft_graph_video, z.object({}).partial().strict()])
      .describe('Video metadata, if the item is a video. Read-only.'),
    webDavUrl: z.string().describe('DAV compatible URL for the item.').nullable(),
    webUrl: z
      .string()
      .describe('URL that displays the resource in the browser. Read-only.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_searchResult = z
  .object({
    onClickTelemetryUrl: z
      .string()
      .describe(
        'A callback URL that can be used to record telemetry information. The application should issue a GET on this URL if the user interacts with this item to improve the quality of results.'
      )
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_security_behaviorDuringRetentionPeriod = z.enum([
  'doNotRetain',
  'retain',
  'retainAsRecord',
  'retainAsRegulatoryRecord',
  'unknownFutureValue',
]);
const microsoft_graph_retentionLabelSettings = z
  .object({
    behaviorDuringRetentionPeriod: z
      .union([
        microsoft_graph_security_behaviorDuringRetentionPeriod,
        z.object({}).partial().strict(),
      ])
      .describe(
        'Describes the item behavior during retention period. Possible values are: doNotRetain, retain, retainAsRecord, retainAsRegulatoryRecord, unknownFutureValue. Read-only.'
      ),
    isContentUpdateAllowed: z
      .boolean()
      .describe('Specifies whether updates to document content are allowed. Read-only.')
      .nullable(),
    isDeleteAllowed: z
      .boolean()
      .describe('Specifies whether the document deletion is allowed. Read-only.')
      .nullable(),
    isLabelUpdateAllowed: z
      .boolean()
      .describe(
        "Specifies whether you're allowed to change the retention label on the document. Read-only."
      )
      .nullable(),
    isMetadataUpdateAllowed: z
      .boolean()
      .describe(
        'Specifies whether updates to the item metadata (for example, the Title field) are blocked. Read-only.'
      )
      .nullable(),
    isRecordLocked: z
      .boolean()
      .describe('Specifies whether the item is locked. Read-write.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_itemRetentionLabel = microsoft_graph_entity.and(
  z
    .object({
      isLabelAppliedExplicitly: z
        .boolean()
        .describe(
          'Specifies whether the label is applied explicitly on the item. True indicates that the label is applied explicitly; otherwise, the label is inherited from its parent. Read-only.'
        )
        .nullable(),
      labelAppliedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().strict()])
        .describe('Identity of the user who applied the label. Read-only.'),
      labelAppliedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the label was applied on the item. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullable(),
      name: z.string().describe('The retention label on the document. Read-write.').nullable(),
      retentionSettings: z
        .union([microsoft_graph_retentionLabelSettings, z.object({}).partial().strict()])
        .describe('The retention settings enforced on the item. Read-write.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_thumbnail = z
  .object({
    content: z.string().describe('The content stream for the thumbnail.').nullable(),
    height: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The height of the thumbnail, in pixels.')
      .nullable(),
    sourceItemId: z
      .string()
      .describe(
        'The unique identifier of the item that provided the thumbnail. This is only available when a folder thumbnail is requested.'
      )
      .nullable(),
    url: z.string().describe('The URL used to fetch the thumbnail content.').nullable(),
    width: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The width of the thumbnail, in pixels.')
      .nullable(),
  })
  .partial()
  .strict();
const microsoft_graph_thumbnailSet = microsoft_graph_entity.and(
  z
    .object({
      large: z
        .union([microsoft_graph_thumbnail, z.object({}).partial().strict()])
        .describe('A 1920x1920 scaled thumbnail.'),
      medium: z
        .union([microsoft_graph_thumbnail, z.object({}).partial().strict()])
        .describe('A 176x176 scaled thumbnail.'),
      small: z
        .union([microsoft_graph_thumbnail, z.object({}).partial().strict()])
        .describe('A 48x48 cropped thumbnail.'),
      source: z
        .union([microsoft_graph_thumbnail, z.object({}).partial().strict()])
        .describe(
          'A custom thumbnail image or the original image used to generate other thumbnails.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_driveItemVersion = microsoft_graph_baseItemVersion.and(
  z
    .object({
      content: z.string().describe('The content stream for this version of the item.').nullable(),
      size: z
        .number()
        .describe('Indicates the size of the content stream for this version of the item.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookApplication = microsoft_graph_entity.and(
  z
    .object({
      calculationMode: z
        .string()
        .describe(
          'Returns the calculation mode used in the workbook. Possible values are: Automatic, AutomaticExceptTables, Manual.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookCommentReply = microsoft_graph_entity.and(
  z
    .object({
      content: z.string().describe('The content of the reply.').nullable(),
      contentType: z.string().describe('The content type for the reply.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookComment = microsoft_graph_entity.and(
  z
    .object({
      content: z.string().describe('The content of the comment.').nullable(),
      contentType: z.string().describe('The content type of the comment.'),
      replies: z
        .array(microsoft_graph_workbookCommentReply)
        .describe('The list of replies to the comment. Read-only. Nullable.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookFunctions = microsoft_graph_entity.and(
  z.object({}).partial().strict()
);
const microsoft_graph_workbookChartFont = microsoft_graph_entity.and(
  z
    .object({
      bold: z.boolean().describe('Indicates whether the fond is bold.').nullable(),
      color: z
        .string()
        .describe(
          'The HTML color code representation of the text color. For example #FF0000 represents Red.'
        )
        .nullable(),
      italic: z.boolean().describe('Indicates whether the fond is italic.').nullable(),
      name: z.string().describe("The font name. For example 'Calibri'.").nullable(),
      size: z
        .union([z.number(), z.string(), ReferenceNumeric])
        .describe('The size of the font. For example,  11.'),
      underline: z
        .string()
        .describe(
          'The type of underlining applied to the font. The possible values are: None, Single.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartLineFormat = microsoft_graph_entity.and(
  z
    .object({
      color: z
        .string()
        .describe('The HTML color code that represents the color of lines in the chart.')
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartAxisFormat = microsoft_graph_entity.and(
  z
    .object({
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().strict()])
        .describe(
          'Represents the font attributes (font name, font size, color, etc.) for a chart axis element. Read-only.'
        ),
      line: z
        .union([microsoft_graph_workbookChartLineFormat, z.object({}).partial().strict()])
        .describe('Represents chart line formatting. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartGridlinesFormat = microsoft_graph_entity.and(
  z
    .object({
      line: z
        .union([microsoft_graph_workbookChartLineFormat, z.object({}).partial().strict()])
        .describe('Represents chart line formatting. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartGridlines = microsoft_graph_entity.and(
  z
    .object({
      visible: z.boolean().describe('Indicates whether the axis gridlines are visible.'),
      format: z
        .union([microsoft_graph_workbookChartGridlinesFormat, z.object({}).partial().strict()])
        .describe('Represents the formatting of chart gridlines. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartAxisTitleFormat = microsoft_graph_entity.and(
  z
    .object({
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().strict()])
        .describe(
          'Represents the font attributes, such as font name, font size, color, etc. of chart axis title object. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartAxisTitle = microsoft_graph_entity.and(
  z
    .object({
      text: z.string().describe('Represents the axis title.').nullable(),
      visible: z.boolean().describe('A Boolean that specifies the visibility of an axis title.'),
      format: z
        .union([microsoft_graph_workbookChartAxisTitleFormat, z.object({}).partial().strict()])
        .describe('Represents the formatting of chart axis title. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartAxis = microsoft_graph_entity.and(
  z
    .object({
      majorUnit: z
        .unknown()
        .describe(
          'Represents the interval between two major tick marks. Can be set to a numeric value or an empty string.  The returned value is always a number.'
        ),
      maximum: z
        .unknown()
        .describe(
          'Represents the maximum value on the value axis.  Can be set to a numeric value or an empty string (for automatic axis values).  The returned value is always a number.'
        ),
      minimum: z
        .unknown()
        .describe(
          'Represents the minimum value on the value axis. Can be set to a numeric value or an empty string (for automatic axis values).  The returned value is always a number.'
        ),
      minorUnit: z
        .unknown()
        .describe(
          "Represents the interval between two minor tick marks. 'Can be set to a numeric value or an empty string (for automatic axis values). The returned value is always a number."
        ),
      format: z
        .union([microsoft_graph_workbookChartAxisFormat, z.object({}).partial().strict()])
        .describe(
          'Represents the formatting of a chart object, which includes line and font formatting. Read-only.'
        ),
      majorGridlines: z
        .union([microsoft_graph_workbookChartGridlines, z.object({}).partial().strict()])
        .describe(
          'Returns a gridlines object that represents the major gridlines for the specified axis. Read-only.'
        ),
      minorGridlines: z
        .union([microsoft_graph_workbookChartGridlines, z.object({}).partial().strict()])
        .describe(
          'Returns a Gridlines object that represents the minor gridlines for the specified axis. Read-only.'
        ),
      title: z
        .union([microsoft_graph_workbookChartAxisTitle, z.object({}).partial().strict()])
        .describe('Represents the axis title. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartAxes = microsoft_graph_entity.and(
  z
    .object({
      categoryAxis: z
        .union([microsoft_graph_workbookChartAxis, z.object({}).partial().strict()])
        .describe('Represents the category axis in a chart. Read-only.'),
      seriesAxis: z
        .union([microsoft_graph_workbookChartAxis, z.object({}).partial().strict()])
        .describe('Represents the series axis of a 3-dimensional chart. Read-only.'),
      valueAxis: z
        .union([microsoft_graph_workbookChartAxis, z.object({}).partial().strict()])
        .describe('Represents the value axis in an axis. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartFill = microsoft_graph_entity.and(
  z.object({}).partial().strict()
);
const microsoft_graph_workbookChartDataLabelFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().strict()])
        .describe('Represents the fill format of the current chart data label. Read-only.'),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().strict()])
        .describe(
          'Represents the font attributes (font name, font size, color, etc.) for a chart data label. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartDataLabels = microsoft_graph_entity.and(
  z
    .object({
      position: z
        .string()
        .describe(
          'DataLabelPosition value that represents the position of the data label. The possible values are: None, Center, InsideEnd, InsideBase, OutsideEnd, Left, Right, Top, Bottom, BestFit, Callout.'
        )
        .nullable(),
      separator: z
        .string()
        .describe('String that represents the separator used for the data labels on a chart.')
        .nullable(),
      showBubbleSize: z
        .boolean()
        .describe('Boolean value that represents whether the data label bubble size is visible.')
        .nullable(),
      showCategoryName: z
        .boolean()
        .describe('Boolean value that represents whether the data label category name is visible.')
        .nullable(),
      showLegendKey: z
        .boolean()
        .describe('Boolean value that represents whether the data label legend key is visible.')
        .nullable(),
      showPercentage: z
        .boolean()
        .describe('Boolean value that represents whether the data label percentage is visible.')
        .nullable(),
      showSeriesName: z
        .boolean()
        .describe('Boolean value that represents whether the data label series name is visible.')
        .nullable(),
      showValue: z
        .boolean()
        .describe('Boolean value that represents whether the data label value is visible.')
        .nullable(),
      format: z
        .union([microsoft_graph_workbookChartDataLabelFormat, z.object({}).partial().strict()])
        .describe(
          'Represents the format of chart data labels, which includes fill and font formatting. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartAreaFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().strict()])
        .describe(
          'Represents the fill format of an object, which includes background formatting information. Read-only.'
        ),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().strict()])
        .describe(
          'Represents the font attributes (font name, font size, color, etc.) for the current object. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartLegendFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().strict()])
        .describe(
          'Represents the fill format of an object, which includes background formating information. Read-only.'
        ),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().strict()])
        .describe(
          'Represents the font attributes such as font name, font size, color, etc. of a chart legend. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartLegend = microsoft_graph_entity.and(
  z
    .object({
      overlay: z
        .boolean()
        .describe(
          'Indicates whether the chart legend should overlap with the main body of the chart.'
        )
        .nullable(),
      position: z
        .string()
        .describe(
          'Represents the position of the legend on the chart. The possible values are: Top, Bottom, Left, Right, Corner, Custom.'
        )
        .nullable(),
      visible: z.boolean().describe('Indicates whether the chart legend is visible.'),
      format: z
        .union([microsoft_graph_workbookChartLegendFormat, z.object({}).partial().strict()])
        .describe(
          'Represents the formatting of a chart legend, which includes fill and font formatting. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartSeriesFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().strict()])
        .describe(
          'Represents the fill format of a chart series, which includes background formatting information. Read-only.'
        ),
      line: z
        .union([microsoft_graph_workbookChartLineFormat, z.object({}).partial().strict()])
        .describe('Represents line formatting. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartPointFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().strict()])
        .describe(
          'Represents the fill format of a chart, which includes background formatting information. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartPoint = microsoft_graph_entity.and(
  z
    .object({
      value: z.unknown().describe('The value of a chart point. Read-only.'),
      format: z
        .union([microsoft_graph_workbookChartPointFormat, z.object({}).partial().strict()])
        .describe('The format properties of the chart point. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartSeries = microsoft_graph_entity.and(
  z
    .object({
      name: z.string().describe('The name of a series in a chart.').nullable(),
      format: z
        .union([microsoft_graph_workbookChartSeriesFormat, z.object({}).partial().strict()])
        .describe(
          'The formatting of a chart series, which includes fill and line formatting. Read-only.'
        ),
      points: z
        .array(microsoft_graph_workbookChartPoint)
        .describe('A collection of all points in the series. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartTitleFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().strict()])
        .describe(
          'Represents the fill format of an object, which includes background formatting information. Read-only.'
        ),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().strict()])
        .describe(
          'Represents the font attributes (font name, font size, color, etc.) for the current object. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChartTitle = microsoft_graph_entity.and(
  z
    .object({
      overlay: z
        .boolean()
        .describe('Indicates whether the chart title will overlay the chart or not.')
        .nullable(),
      text: z.string().describe('The title text of the chart.').nullable(),
      visible: z.boolean().describe('Indicates whether the chart title is visible.'),
      format: z
        .union([microsoft_graph_workbookChartTitleFormat, z.object({}).partial().strict()])
        .describe(
          'The formatting of a chart title, which includes fill and font formatting. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookChart: z.ZodType<microsoft_graph_workbookChart> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        height: z
          .union([z.number(), z.string(), ReferenceNumeric])
          .describe('Represents the height, in points, of the chart object.'),
        left: z
          .union([z.number(), z.string(), ReferenceNumeric])
          .describe(
            'The distance, in points, from the left side of the chart to the worksheet origin.'
          ),
        name: z.string().describe('Represents the name of a chart object.').nullable(),
        top: z
          .union([z.number(), z.string(), ReferenceNumeric])
          .describe(
            'Represents the distance, in points, from the top edge of the object to the top of row 1 (on a worksheet) or the top of the chart area (on a chart).'
          ),
        width: z
          .union([z.number(), z.string(), ReferenceNumeric])
          .describe('Represents the width, in points, of the chart object.'),
        axes: z
          .union([microsoft_graph_workbookChartAxes, z.object({}).partial().strict()])
          .describe('Represents chart axes. Read-only.'),
        dataLabels: z
          .union([microsoft_graph_workbookChartDataLabels, z.object({}).partial().strict()])
          .describe('Represents the data labels on the chart. Read-only.'),
        format: z
          .union([microsoft_graph_workbookChartAreaFormat, z.object({}).partial().strict()])
          .describe('Encapsulates the format properties for the chart area. Read-only.'),
        legend: z
          .union([microsoft_graph_workbookChartLegend, z.object({}).partial().strict()])
          .describe('Represents the legend for the chart. Read-only.'),
        series: z
          .array(microsoft_graph_workbookChartSeries)
          .describe(
            'Represents either a single series or collection of series in the chart. Read-only.'
          ),
        title: z
          .union([microsoft_graph_workbookChartTitle, z.object({}).partial().strict()])
          .describe(
            'Represents the title of the specified chart, including the text, visibility, position and formatting of the title. Read-only.'
          ),
        worksheet: z
          .union([microsoft_graph_workbookWorksheet, z.object({}).partial().strict()])
          .describe('The worksheet containing the current chart. Read-only.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_workbookPivotTable: z.ZodType<microsoft_graph_workbookPivotTable> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          name: z.string().describe('The name of the pivot table.').nullable(),
          worksheet: z
            .union([microsoft_graph_workbookWorksheet, z.object({}).partial().strict()])
            .describe('The worksheet that contains the current pivot table. Read-only.'),
        })
        .partial()
        .strict()
    )
);
const microsoft_graph_workbookWorksheetProtectionOptions = z
  .object({
    allowAutoFilter: z
      .boolean()
      .describe(
        'Represents the worksheet protection option of allowing using auto filter feature.'
      ),
    allowDeleteColumns: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing deleting columns.'),
    allowDeleteRows: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing deleting rows.'),
    allowFormatCells: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing formatting cells.'),
    allowFormatColumns: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing formatting columns.'),
    allowFormatRows: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing formatting rows.'),
    allowInsertColumns: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing inserting columns.'),
    allowInsertHyperlinks: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing inserting hyperlinks.'),
    allowInsertRows: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing inserting rows.'),
    allowPivotTables: z
      .boolean()
      .describe(
        'Represents the worksheet protection option of allowing using pivot table feature.'
      ),
    allowSort: z
      .boolean()
      .describe('Represents the worksheet protection option of allowing using sort feature.'),
  })
  .partial()
  .strict();
const microsoft_graph_workbookWorksheetProtection = microsoft_graph_entity.and(
  z
    .object({
      options: z
        .union([
          microsoft_graph_workbookWorksheetProtectionOptions,
          z.object({}).partial().strict(),
        ])
        .describe('Worksheet protection options. Read-only.'),
      protected: z.boolean().describe('Indicates whether the worksheet is protected.  Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookIcon = z
  .object({
    index: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The index of the icon in the given set.'),
    set: z
      .string()
      .describe(
        'The set that the icon is part of. The possible values are: Invalid, ThreeArrows, ThreeArrowsGray, ThreeFlags, ThreeTrafficLights1, ThreeTrafficLights2, ThreeSigns, ThreeSymbols, ThreeSymbols2, FourArrows, FourArrowsGray, FourRedToBlack, FourRating, FourTrafficLights, FiveArrows, FiveArrowsGray, FiveRating, FiveQuarters, ThreeStars, ThreeTriangles, FiveBoxes.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_workbookFilterCriteria = z
  .object({
    color: z.string().describe('The color applied to the cell.').nullable(),
    criterion1: z.string().describe('A custom criterion.').nullable(),
    criterion2: z.string().describe('A custom criterion.').nullable(),
    dynamicCriteria: z.string().describe('A dynamic formula specified in a custom filter.'),
    filterOn: z.string().describe('Indicates whether a filter is applied to a column.'),
    icon: z
      .union([microsoft_graph_workbookIcon, z.object({}).partial().strict()])
      .describe('An icon applied to a cell via conditional formatting.'),
    operator: z.string().describe('An operator in a cell; for example, =, >, <, <=, or <>.'),
    values: z.unknown().describe('The values that appear in the cell.'),
  })
  .partial()
  .strict();
const microsoft_graph_workbookFilter = microsoft_graph_entity.and(
  z
    .object({
      criteria: z
        .union([microsoft_graph_workbookFilterCriteria, z.object({}).partial().strict()])
        .describe('The currently applied filter on the given column. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookTableColumn = microsoft_graph_entity.and(
  z
    .object({
      index: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'The index of the column within the columns collection of the table. Zero-indexed. Read-only.'
        ),
      name: z.string().describe('The name of the table column.').nullable(),
      values: z
        .unknown()
        .describe(
          'TRepresents the raw values of the specified range. The data returned could be of type string, number, or a Boolean. Cell that contain an error will return the error string.'
        ),
      filter: z
        .union([microsoft_graph_workbookFilter, z.object({}).partial().strict()])
        .describe('The filter applied to the column. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookTableRow = microsoft_graph_entity.and(
  z
    .object({
      index: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'The index of the row within the rows collection of the table. Zero-based. Read-only.'
        ),
      values: z
        .unknown()
        .describe(
          'The raw values of the specified range. The data returned could be of type string, number, or a Boolean. Any cell that contain an error will return the error string.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookSortField = z
  .object({
    ascending: z
      .boolean()
      .describe('Represents whether the sorting is done in an ascending fashion.'),
    color: z
      .string()
      .describe(
        'Represents the color that is the target of the condition if the sorting is on font or cell color.'
      )
      .nullable(),
    dataOption: z
      .string()
      .describe(
        'Represents additional sorting options for this field. The possible values are: Normal, TextAsNumber.'
      ),
    icon: z
      .union([microsoft_graph_workbookIcon, z.object({}).partial().strict()])
      .describe(
        "Represents the icon that is the target of the condition if the sorting is on the cell's icon."
      ),
    key: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'Represents the column (or row, depending on the sort orientation) that the condition is on. Represented as an offset from the first column (or row).'
      ),
    sortOn: z
      .string()
      .describe(
        'Represents the type of sorting of this condition. The possible values are: Value, CellColor, FontColor, Icon.'
      ),
  })
  .partial()
  .strict();
const microsoft_graph_workbookTableSort = microsoft_graph_entity.and(
  z
    .object({
      fields: z
        .array(microsoft_graph_workbookSortField)
        .describe('The list of the current conditions last used to sort the table. Read-only.'),
      matchCase: z
        .boolean()
        .describe('Indicates whether the casing impacted the last sort of the table. Read-only.'),
      method: z
        .string()
        .describe(
          'The Chinese character ordering method last used to sort the table. The possible values are: PinYin, StrokeCount. Read-only.'
        ),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookTable: z.ZodType<microsoft_graph_workbookTable> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        highlightFirstColumn: z
          .boolean()
          .describe('Indicates whether the first column contains special formatting.'),
        highlightLastColumn: z
          .boolean()
          .describe('Indicates whether the last column contains special formatting.'),
        legacyId: z
          .string()
          .describe(
            "A legacy identifier used in older Excel clients. The value of the identifier remains the same even when the table is renamed. This property should be interpreted as an opaque string value and shouldn't be parsed to any other type. Read-only."
          )
          .nullable(),
        name: z.string().describe('The name of the table.').nullable(),
        showBandedColumns: z
          .boolean()
          .describe(
            'Indicates whether the columns show banded formatting in which odd columns are highlighted differently from even ones to make reading the table easier.'
          ),
        showBandedRows: z
          .boolean()
          .describe(
            'Indicates whether the rows show banded formatting in which odd rows are highlighted differently from even ones to make reading the table easier.'
          ),
        showFilterButton: z
          .boolean()
          .describe(
            'Indicates whether the filter buttons are visible at the top of each column header. Setting this is only allowed if the table contains a header row.'
          ),
        showHeaders: z
          .boolean()
          .describe(
            'Indicates whether the header row is visible or not. This value can be set to show or remove the header row.'
          ),
        showTotals: z
          .boolean()
          .describe(
            'Indicates whether the total row is visible or not. This value can be set to show or remove the total row.'
          ),
        style: z
          .string()
          .describe(
            'A constant value that represents the Table style. Possible values are: TableStyleLight1 through TableStyleLight21, TableStyleMedium1 through TableStyleMedium28, TableStyleStyleDark1 through TableStyleStyleDark11. A custom user-defined style present in the workbook can also be specified.'
          )
          .nullable(),
        columns: z
          .array(microsoft_graph_workbookTableColumn)
          .describe('The list of all the columns in the table. Read-only.'),
        rows: z
          .array(microsoft_graph_workbookTableRow)
          .describe('The list of all the rows in the table. Read-only.'),
        sort: z
          .union([microsoft_graph_workbookTableSort, z.object({}).partial().strict()])
          .describe('The sorting for the table. Read-only.'),
        worksheet: z
          .union([microsoft_graph_workbookWorksheet, z.object({}).partial().strict()])
          .describe('The worksheet containing the current table. Read-only.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_workbookWorksheet: z.ZodType<microsoft_graph_workbookWorksheet> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        name: z.string().describe('The display name of the worksheet.').nullable(),
        position: z
          .number()
          .gte(-2147483648)
          .lte(2147483647)
          .describe('The zero-based position of the worksheet within the workbook.'),
        visibility: z
          .string()
          .describe(
            'The visibility of the worksheet. The possible values are: Visible, Hidden, VeryHidden.'
          ),
        charts: z
          .array(microsoft_graph_workbookChart)
          .describe('The list of charts that are part of the worksheet. Read-only.'),
        names: z
          .array(microsoft_graph_workbookNamedItem)
          .describe('The list of names that are associated with the worksheet. Read-only.'),
        pivotTables: z
          .array(microsoft_graph_workbookPivotTable)
          .describe('The list of piot tables that are part of the worksheet.'),
        protection: z
          .union([microsoft_graph_workbookWorksheetProtection, z.object({}).partial().strict()])
          .describe('The sheet protection object for a worksheet. Read-only.'),
        tables: z
          .array(microsoft_graph_workbookTable)
          .describe('The list of tables that are part of the worksheet. Read-only.'),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_workbookNamedItem: z.ZodType<microsoft_graph_workbookNamedItem> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        comment: z.string().describe('The comment associated with this name.').nullable(),
        name: z.string().describe('The name of the object. Read-only.').nullable(),
        scope: z
          .string()
          .describe(
            'Indicates whether the name is scoped to the workbook or to a specific worksheet. Read-only.'
          ),
        type: z
          .string()
          .describe(
            'The type of reference is associated with the name. Possible values are: String, Integer, Double, Boolean, Range. Read-only.'
          )
          .nullable(),
        value: z
          .unknown()
          .describe(
            'The formula that the name is defined to refer to. For example, =Sheet14!$B$2:$H$12 and =4.75. Read-only.'
          ),
        visible: z.boolean().describe('Indicates whether the object is visible.'),
        worksheet: z
          .union([microsoft_graph_workbookWorksheet, z.object({}).partial().strict()])
          .describe(
            'Returns the worksheet to which the named item is scoped. Available only if the item is scoped to the worksheet. Read-only.'
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_workbookOperationError: z.ZodType<microsoft_graph_workbookOperationError> =
  z.lazy(() =>
    z
      .object({
        code: z.string().describe('The error code.').nullable(),
        innerError: z.union([
          microsoft_graph_workbookOperationError,
          z.object({}).partial().strict(),
        ]),
        message: z.string().describe('The error message.').nullable(),
      })
      .partial()
      .strict()
  );
const microsoft_graph_workbookOperationStatus = z.enum([
  'notStarted',
  'running',
  'succeeded',
  'failed',
]);
const microsoft_graph_workbookOperation = microsoft_graph_entity.and(
  z
    .object({
      error: z
        .union([microsoft_graph_workbookOperationError, z.object({}).partial().strict()])
        .describe('The error returned by the operation.'),
      resourceLocation: z.string().describe('The resource URI for the result.').nullable(),
      status: microsoft_graph_workbookOperationStatus,
    })
    .partial()
    .strict()
);
const microsoft_graph_workbook = microsoft_graph_entity.and(
  z
    .object({
      application: z.union([microsoft_graph_workbookApplication, z.object({}).partial().strict()]),
      comments: z
        .array(microsoft_graph_workbookComment)
        .describe('Represents a collection of comments in a workbook.'),
      functions: z.union([microsoft_graph_workbookFunctions, z.object({}).partial().strict()]),
      names: z
        .array(microsoft_graph_workbookNamedItem)
        .describe(
          'Represents a collection of workbooks scoped named items (named ranges and constants). Read-only.'
        ),
      operations: z
        .array(microsoft_graph_workbookOperation)
        .describe(
          'The status of workbook operations. Getting an operation collection is not supported, but you can get the status of a long-running operation if the Location header is returned in the response. Read-only.'
        ),
      tables: z
        .array(microsoft_graph_workbookTable)
        .describe('Represents a collection of tables associated with the workbook. Read-only.'),
      worksheets: z
        .array(microsoft_graph_workbookWorksheet)
        .describe('Represents a collection of worksheets associated with the workbook. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_driveItem: z.ZodType<microsoft_graph_driveItem> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        audio: z
          .union([microsoft_graph_audio, z.object({}).partial().strict()])
          .describe(
            'Audio metadata, if the item is an audio file. Read-only. Read-only. Only on OneDrive Personal.'
          ),
        bundle: z
          .union([microsoft_graph_bundle, z.object({}).partial().strict()])
          .describe('Bundle metadata, if the item is a bundle. Read-only.'),
        content: z
          .string()
          .describe('The content stream, if the item represents a file.')
          .nullable(),
        cTag: z
          .string()
          .describe(
            "An eTag for the content of the item. This eTag isn't changed if only the metadata is changed. Note This property isn't returned if the item is a folder. Read-only."
          )
          .nullable(),
        deleted: z
          .union([microsoft_graph_deleted, z.object({}).partial().strict()])
          .describe('Information about the deleted state of the item. Read-only.'),
        file: z
          .union([microsoft_graph_file, z.object({}).partial().strict()])
          .describe('File metadata, if the item is a file. Read-only.'),
        fileSystemInfo: z
          .union([microsoft_graph_fileSystemInfo, z.object({}).partial().strict()])
          .describe('File system information on client. Read-write.'),
        folder: z
          .union([microsoft_graph_folder, z.object({}).partial().strict()])
          .describe('Folder metadata, if the item is a folder. Read-only.'),
        image: z
          .union([microsoft_graph_image, z.object({}).partial().strict()])
          .describe('Image metadata, if the item is an image. Read-only.'),
        location: z
          .union([microsoft_graph_geoCoordinates, z.object({}).partial().strict()])
          .describe('Location metadata, if the item has location data. Read-only.'),
        malware: z
          .union([microsoft_graph_malware, z.object({}).partial().strict()])
          .describe('Malware metadata, if the item was detected to contain malware. Read-only.'),
        package: z
          .union([microsoft_graph_package, z.object({}).partial().strict()])
          .describe(
            'If present, indicates that this item is a package instead of a folder or file. Packages are treated like files in some contexts and folders in others. Read-only.'
          ),
        pendingOperations: z
          .union([microsoft_graph_pendingOperations, z.object({}).partial().strict()])
          .describe(
            'If present, indicates that one or more operations that might affect the state of the driveItem are pending completion. Read-only.'
          ),
        photo: z
          .union([microsoft_graph_photo, z.object({}).partial().strict()])
          .describe('Photo metadata, if the item is a photo. Read-only.'),
        publication: z
          .union([microsoft_graph_publicationFacet, z.object({}).partial().strict()])
          .describe(
            "Provides information about the published or checked-out state of an item, in locations that support such actions. This property isn't returned by default. Read-only."
          ),
        remoteItem: z
          .union([microsoft_graph_remoteItem, z.object({}).partial().strict()])
          .describe(
            'Remote item data, if the item is shared from a drive other than the one being accessed. Read-only.'
          ),
        root: z
          .union([microsoft_graph_root, z.object({}).partial().strict()])
          .describe(
            'If this property is non-null, it indicates that the driveItem is the top-most driveItem in the drive.'
          ),
        searchResult: z
          .union([microsoft_graph_searchResult, z.object({}).partial().strict()])
          .describe('Search metadata, if the item is from a search result. Read-only.'),
        shared: z
          .union([microsoft_graph_shared, z.object({}).partial().strict()])
          .describe(
            'Indicates that the item was shared with others and provides information about the shared state of the item. Read-only.'
          ),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().strict()])
          .describe('Returns identifiers useful for SharePoint REST compatibility. Read-only.'),
        size: z.number().describe('Size of the item in bytes. Read-only.').nullable(),
        specialFolder: z
          .union([microsoft_graph_specialFolder, z.object({}).partial().strict()])
          .describe(
            'If the current item is also available as a special folder, this facet is returned. Read-only.'
          ),
        video: z
          .union([microsoft_graph_video, z.object({}).partial().strict()])
          .describe('Video metadata, if the item is a video. Read-only.'),
        webDavUrl: z.string().describe('WebDAV compatible URL for the item.').nullable(),
        analytics: z
          .union([microsoft_graph_itemAnalytics, z.object({}).partial().strict()])
          .describe('Analytics about the view activities that took place on this item.'),
        children: z
          .array(microsoft_graph_driveItem)
          .describe(
            'Collection containing Item objects for the immediate children of Item. Only items representing folders have children. Read-only. Nullable.'
          ),
        listItem: z
          .union([microsoft_graph_listItem, z.object({}).partial().strict()])
          .describe(
            'For drives in SharePoint, the associated document library list item. Read-only. Nullable.'
          ),
        permissions: z
          .array(microsoft_graph_permission)
          .describe('The set of permissions for the item. Read-only. Nullable.'),
        retentionLabel: z
          .union([microsoft_graph_itemRetentionLabel, z.object({}).partial().strict()])
          .describe(
            'Information about retention label and settings enforced on the driveItem. Read-write.'
          ),
        subscriptions: z
          .array(microsoft_graph_subscription)
          .describe('The set of subscriptions on the item. Only supported on the root of a drive.'),
        thumbnails: z
          .array(microsoft_graph_thumbnailSet)
          .describe(
            'Collection of thumbnailSet objects associated with the item. For more information, see getting thumbnails. Read-only. Nullable.'
          ),
        versions: z
          .array(microsoft_graph_driveItemVersion)
          .describe(
            'The list of previous versions of the item. For more info, see getting previous versions. Read-only. Nullable.'
          ),
        workbook: z
          .union([microsoft_graph_workbook, z.object({}).partial().strict()])
          .describe(
            "For files that are Excel spreadsheets, access to the workbook API to work with the spreadsheet's contents. Nullable."
          ),
      })
      .partial()
      .strict()
  )
);
const microsoft_graph_driveItemCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_driveItem) })
    .partial()
    .strict()
);
const microsoft_graph_workbookWorksheetCollectionResponse =
  BaseCollectionPaginationCountResponse.and(
    z
      .object({ value: z.array(microsoft_graph_workbookWorksheet) })
      .partial()
      .strict()
  );
const create_excel_chart_Body = z
  .object({ type: z.string(), sourceData: z.unknown(), seriesBy: z.string() })
  .partial()
  .strict();
const microsoft_graph_workbookRangeBorder = microsoft_graph_entity.and(
  z
    .object({
      color: z
        .string()
        .describe(
          "The HTML color code that represents the color of the border line. Can either be of the form #RRGGBB, for example 'FFA500', or a named HTML color, for example 'orange'."
        )
        .nullable(),
      sideIndex: z
        .string()
        .describe(
          'Indicates the specific side of the border. The possible values are: EdgeTop, EdgeBottom, EdgeLeft, EdgeRight, InsideVertical, InsideHorizontal, DiagonalDown, DiagonalUp. Read-only.'
        )
        .nullable(),
      style: z
        .string()
        .describe(
          'Indicates the line style for the border. The possible values are: None, Continuous, Dash, DashDot, DashDotDot, Dot, Double, SlantDashDot.'
        )
        .nullable(),
      weight: z
        .string()
        .describe(
          'The weight of the border around a range. The possible values are: Hairline, Thin, Medium, Thick.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookRangeFill = microsoft_graph_entity.and(
  z
    .object({
      color: z
        .string()
        .describe(
          "HTML color code representing the color of the border line. Can either be of the form #RRGGBB, for example 'FFA500', or be a named HTML color, for example 'orange'."
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookRangeFont = microsoft_graph_entity.and(
  z
    .object({
      bold: z.boolean().describe('Inidicates whether the font is bold.').nullable(),
      color: z
        .string()
        .describe(
          'The HTML color code representation of the text color. For example, #FF0000 represents the color red.'
        )
        .nullable(),
      italic: z.boolean().describe('Inidicates whether the font is italic.').nullable(),
      name: z.string().describe("The font name. For example, 'Calibri'.").nullable(),
      size: z.union([z.number(), z.string(), ReferenceNumeric]).describe('The font size.'),
      underline: z
        .string()
        .describe(
          'The type of underlining applied to the font. The possible values are: None, Single, Double, SingleAccountant, DoubleAccountant.'
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookFormatProtection = microsoft_graph_entity.and(
  z
    .object({
      formulaHidden: z
        .boolean()
        .describe(
          "Indicates whether Excel hides the formula for the cells in the range. A null value indicates that the entire range doesn't have uniform formula hidden setting."
        )
        .nullable(),
      locked: z
        .boolean()
        .describe(
          "Indicates whether Excel locks the cells in the object. A null value indicates that the entire range doesn't have uniform lock setting."
        )
        .nullable(),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookRangeFormat = microsoft_graph_entity.and(
  z
    .object({
      columnWidth: z
        .union([z.number(), z.string(), ReferenceNumeric])
        .describe(
          "The width of all columns within the range. If the column widths aren't uniform, null will be returned."
        ),
      horizontalAlignment: z
        .string()
        .describe(
          'The horizontal alignment for the specified object. Possible values are: General, Left, Center, Right, Fill, Justify, CenterAcrossSelection, Distributed.'
        )
        .nullable(),
      rowHeight: z
        .union([z.number(), z.string(), ReferenceNumeric])
        .describe(
          "The height of all rows in the range. If the row heights aren't uniform null will be returned."
        ),
      verticalAlignment: z
        .string()
        .describe(
          'The vertical alignment for the specified object. Possible values are: Top, Center, Bottom, Justify, Distributed.'
        )
        .nullable(),
      wrapText: z
        .boolean()
        .describe(
          "Indicates whether Excel wraps the text in the object. A null value indicates that the entire range doesn't have a uniform wrap setting."
        )
        .nullable(),
      borders: z
        .array(microsoft_graph_workbookRangeBorder)
        .describe(
          'Collection of border objects that apply to the overall range selected Read-only.'
        ),
      fill: z
        .union([microsoft_graph_workbookRangeFill, z.object({}).partial().strict()])
        .describe('Returns the fill object defined on the overall range. Read-only.'),
      font: z
        .union([microsoft_graph_workbookRangeFont, z.object({}).partial().strict()])
        .describe('Returns the font object defined on the overall range selected Read-only.'),
      protection: z
        .union([microsoft_graph_workbookFormatProtection, z.object({}).partial().strict()])
        .describe('Returns the format protection object for a range. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_workbookRangeSort = microsoft_graph_entity.and(
  z.object({}).partial().strict()
);
const microsoft_graph_workbookRange = microsoft_graph_entity.and(
  z
    .object({
      address: z
        .string()
        .describe(
          'Represents the range reference in A1-style. Address value contains the Sheet reference (for example, Sheet1!A1:B4). Read-only.'
        )
        .nullable(),
      addressLocal: z
        .string()
        .describe(
          'Represents range reference for the specified range in the language of the user. Read-only.'
        )
        .nullable(),
      cellCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Number of cells in the range. Read-only.'),
      columnCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Represents the total number of columns in the range. Read-only.'),
      columnHidden: z
        .boolean()
        .describe('Indicates whether all columns of the current range are hidden.')
        .nullable(),
      columnIndex: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'Represents the column number of the first cell in the range. Zero-indexed. Read-only.'
        ),
      formulas: z.unknown().describe('Represents the formula in A1-style notation.'),
      formulasLocal: z
        .unknown()
        .describe(
          "Represents the formula in A1-style notation, in the user's language and number-formatting locale.  For example, the English '=SUM(A1, 1.5)' formula would become '=SUMME(A1; 1,5)' in German."
        ),
      formulasR1C1: z.unknown().describe('Represents the formula in R1C1-style notation.'),
      hidden: z
        .boolean()
        .describe('Represents if all cells of the current range are hidden. Read-only.')
        .nullable(),
      numberFormat: z
        .unknown()
        .describe("Represents Excel's number format code for the given cell."),
      rowCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('Returns the total number of rows in the range. Read-only.'),
      rowHidden: z
        .boolean()
        .describe('Indicates whether all rows of the current range are hidden.')
        .nullable(),
      rowIndex: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe(
          'Returns the row number of the first cell in the range. Zero-indexed. Read-only.'
        ),
      text: z
        .unknown()
        .describe(
          "Text values of the specified range. The Text value doesn't depend on the cell width. The # sign substitution that happens in Excel UI doesn't affect the text value returned by the API. Read-only."
        ),
      values: z
        .unknown()
        .describe(
          'Represents the raw values of the specified range. The data returned can be of type string, number, or a Boolean. Cell that contains an error returns the error string.'
        ),
      valueTypes: z
        .unknown()
        .describe(
          'Represents the type of data of each cell. The possible values are: Unknown, Empty, String, Integer, Double, Boolean, Error. Read-only.'
        ),
      format: z
        .union([microsoft_graph_workbookRangeFormat, z.object({}).partial().strict()])
        .describe(
          "Returns a format object, encapsulating the range's font, fill, borders, alignment, and other properties. Read-only."
        ),
      sort: z
        .union([microsoft_graph_workbookRangeSort, z.object({}).partial().strict()])
        .describe('The worksheet containing the current range. Read-only.'),
      worksheet: z
        .union([microsoft_graph_workbookWorksheet, z.object({}).partial().strict()])
        .describe('The worksheet containing the current range. Read-only.'),
    })
    .partial()
    .strict()
);
const microsoft_graph_calendarCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_calendar) })
    .partial()
    .strict()
);
const microsoft_graph_eventCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_event) })
    .partial()
    .strict()
);
const microsoft_graph_contactCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_contact) })
    .partial()
    .strict()
);
const microsoft_graph_driveCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_drive) })
    .partial()
    .strict()
);
const microsoft_graph_mailFolderCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_mailFolder) })
    .partial()
    .strict()
);
const microsoft_graph_messageCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_message) })
    .partial()
    .strict()
);
const send_mail_Body = z
  .object({
    Message: microsoft_graph_message,
    SaveToSentItems: z.boolean().nullable().default(false),
  })
  .partial()
  .strict();
const microsoft_graph_notebookCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_notebook) })
    .partial()
    .strict()
);
const microsoft_graph_onenoteSectionCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_onenoteSection) })
    .partial()
    .strict()
);
const microsoft_graph_onenotePageCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_onenotePage) })
    .partial()
    .strict()
);
const microsoft_graph_plannerTaskCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_plannerTask) })
    .partial()
    .strict()
);
const microsoft_graph_todoTaskListCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_todoTaskList) })
    .partial()
    .strict()
);
const microsoft_graph_todoTaskCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_todoTask) })
    .partial()
    .strict()
);

export const schemas = {
  microsoft_graph_ODataErrors_ErrorDetails,
  microsoft_graph_ODataErrors_InnerError,
  microsoft_graph_ODataErrors_MainError,
  microsoft_graph_ODataErrors_ODataError,
  BaseCollectionPaginationCountResponse,
  microsoft_graph_entity,
  microsoft_graph_identity,
  microsoft_graph_identitySet,
  microsoft_graph_sharepointIds,
  microsoft_graph_itemReference,
  microsoft_graph_directoryObject,
  microsoft_graph_assignedLicense,
  microsoft_graph_assignedPlan,
  microsoft_graph_authorizationInfo,
  microsoft_graph_customSecurityAttributeValue,
  microsoft_graph_employeeOrgData,
  microsoft_graph_objectIdentity,
  microsoft_graph_licenseAssignmentState,
  microsoft_graph_externalAudienceScope,
  microsoft_graph_dateTimeTimeZone,
  microsoft_graph_automaticRepliesStatus,
  microsoft_graph_automaticRepliesSetting,
  microsoft_graph_delegateMeetingMessageDeliveryOptions,
  microsoft_graph_localeInfo,
  microsoft_graph_userPurpose,
  microsoft_graph_dayOfWeek,
  microsoft_graph_timeZoneBase,
  microsoft_graph_workingHours,
  microsoft_graph_mailboxSettings,
  microsoft_graph_onPremisesExtensionAttributes,
  microsoft_graph_onPremisesProvisioningError,
  microsoft_graph_passwordProfile,
  microsoft_graph_printColorMode,
  microsoft_graph_integerRange,
  microsoft_graph_printDuplexMode,
  microsoft_graph_printerFeedOrientation,
  microsoft_graph_printFinishing,
  microsoft_graph_printMultipageLayout,
  microsoft_graph_printOrientation,
  microsoft_graph_printQuality,
  microsoft_graph_printScaling,
  microsoft_graph_printerCapabilities,
  microsoft_graph_printerDefaults,
  ReferenceNumeric,
  microsoft_graph_printerLocation,
  microsoft_graph_printerProcessingStateDetail,
  microsoft_graph_printerProcessingState,
  microsoft_graph_printerStatus,
  microsoft_graph_printMargin,
  microsoft_graph_printJobConfiguration,
  microsoft_graph_userIdentity,
  microsoft_graph_printJobStateDetail,
  microsoft_graph_printJobProcessingState,
  microsoft_graph_printJobStatus,
  microsoft_graph_printDocument,
  microsoft_graph_printTaskProcessingState,
  microsoft_graph_printTaskStatus,
  microsoft_graph_appIdentity,
  microsoft_graph_printTaskDefinition,
  microsoft_graph_printEvent,
  microsoft_graph_printTaskTrigger,
  microsoft_graph_printTask,
  microsoft_graph_printJob,
  microsoft_graph_printerBase,
  microsoft_graph_printerShareViewpoint,
  microsoft_graph_assignedLabel,
  microsoft_graph_licenseProcessingState,
  microsoft_graph_serviceProvisioningError,
  microsoft_graph_appRoleAssignment,
  microsoft_graph_onlineMeetingProviderType,
  microsoft_graph_calendarColor,
  microsoft_graph_emailAddress,
  microsoft_graph_calendarRoleType,
  microsoft_graph_calendarPermission,
  microsoft_graph_outlookItem,
  microsoft_graph_recipient,
  microsoft_graph_attendeeType,
  microsoft_graph_attendeeBase,
  microsoft_graph_timeSlot,
  microsoft_graph_responseType,
  microsoft_graph_responseStatus,
  microsoft_graph_attendee,
  microsoft_graph_bodyType,
  microsoft_graph_itemBody,
  microsoft_graph_importance,
  microsoft_graph_physicalAddress,
  microsoft_graph_outlookGeoCoordinates,
  microsoft_graph_locationType,
  microsoft_graph_locationUniqueIdType,
  microsoft_graph_location,
  microsoft_graph_phoneType,
  microsoft_graph_phone,
  microsoft_graph_onlineMeetingInfo,
  microsoft_graph_weekIndex,
  microsoft_graph_recurrencePatternType,
  microsoft_graph_recurrencePattern,
  microsoft_graph_recurrenceRangeType,
  microsoft_graph_recurrenceRange,
  microsoft_graph_patternedRecurrence,
  microsoft_graph_sensitivity,
  microsoft_graph_freeBusyStatus,
  microsoft_graph_eventType,
  microsoft_graph_attachment,
  microsoft_graph_extension,
  microsoft_graph_multiValueLegacyExtendedProperty,
  microsoft_graph_singleValueLegacyExtendedProperty,
  microsoft_graph_event,
  microsoft_graph_calendar,
  microsoft_graph_post,
  microsoft_graph_conversationThread,
  microsoft_graph_conversation,
  microsoft_graph_storagePlanInformation,
  microsoft_graph_quota,
  microsoft_graph_systemFacet,
  microsoft_graph_listInfo,
  microsoft_graph_booleanColumn,
  microsoft_graph_calculatedColumn,
  microsoft_graph_choiceColumn,
  microsoft_graph_contentApprovalStatusColumn,
  microsoft_graph_currencyColumn,
  microsoft_graph_dateTimeColumn,
  microsoft_graph_defaultColumnValue,
  microsoft_graph_geolocationColumn,
  microsoft_graph_hyperlinkOrPictureColumn,
  microsoft_graph_lookupColumn,
  microsoft_graph_numberColumn,
  microsoft_graph_personOrGroupColumn,
  microsoft_graph_contentTypeInfo,
  microsoft_graph_termStore_localizedDescription,
  microsoft_graph_termStore_localizedLabel,
  microsoft_graph_keyValue,
  microsoft_graph_termStore_relationType,
  microsoft_graph_termStore_localizedName,
  microsoft_graph_termStore_termGroupScope,
  microsoft_graph_termStore_group,
  microsoft_graph_termStore_set,
  microsoft_graph_termStore_relation,
  microsoft_graph_termStore_term,
  microsoft_graph_termColumn,
  microsoft_graph_textColumn,
  microsoft_graph_thumbnailColumn,
  microsoft_graph_columnTypes,
  microsoft_graph_displayNameLocalization,
  microsoft_graph_columnValidation,
  microsoft_graph_columnDefinition,
  microsoft_graph_documentSetContent,
  microsoft_graph_documentSet,
  microsoft_graph_contentTypeOrder,
  microsoft_graph_columnLink,
  microsoft_graph_contentType,
  microsoft_graph_itemActionStat,
  microsoft_graph_incompleteData,
  microsoft_graph_accessAction,
  microsoft_graph_itemActivity,
  microsoft_graph_itemActivityStat,
  microsoft_graph_itemAnalytics,
  microsoft_graph_publicationFacet,
  microsoft_graph_baseItemVersion,
  microsoft_graph_fieldValueSet,
  microsoft_graph_listItemVersion,
  microsoft_graph_documentSetVersionItem,
  microsoft_graph_documentSetVersion,
  microsoft_graph_listItem,
  microsoft_graph_longRunningOperationStatus,
  microsoft_graph_longRunningOperation,
  microsoft_graph_publicErrorDetail,
  microsoft_graph_publicInnerError,
  microsoft_graph_publicError,
  microsoft_graph_richLongRunningOperation,
  microsoft_graph_subscription,
  microsoft_graph_list,
  microsoft_graph_drive,
  microsoft_graph_groupLifecyclePolicy,
  microsoft_graph_onenoteEntityBaseModel,
  microsoft_graph_onenoteEntitySchemaObjectModel,
  microsoft_graph_onenoteEntityHierarchyModel,
  microsoft_graph_externalLink,
  microsoft_graph_notebookLinks,
  microsoft_graph_onenoteUserRole,
  microsoft_graph_sectionLinks,
  microsoft_graph_pageLinks,
  microsoft_graph_onenotePage,
  microsoft_graph_onenoteSection,
  microsoft_graph_sectionGroup,
  microsoft_graph_notebook,
  microsoft_graph_operationStatus,
  microsoft_graph_operation,
  microsoft_graph_onenoteOperationError,
  microsoft_graph_onenoteOperation,
  microsoft_graph_onenoteResource,
  microsoft_graph_onenote,
  microsoft_graph_resourceSpecificPermissionGrant,
  microsoft_graph_profilePhoto,
  microsoft_graph_plannerContainerType,
  microsoft_graph_plannerPlanContainer,
  microsoft_graph_plannerAppliedCategories,
  microsoft_graph_plannerAssignments,
  microsoft_graph_plannerPreviewType,
  microsoft_graph_plannerOrderHintsByAssignee,
  microsoft_graph_plannerAssignedToTaskBoardTaskFormat,
  microsoft_graph_plannerBucketTaskBoardTaskFormat,
  microsoft_graph_plannerChecklistItems,
  microsoft_graph_plannerExternalReferences,
  microsoft_graph_plannerTaskDetails,
  microsoft_graph_plannerProgressTaskBoardTaskFormat,
  microsoft_graph_plannerTask,
  microsoft_graph_plannerBucket,
  microsoft_graph_plannerCategoryDescriptions,
  microsoft_graph_plannerUserIds,
  microsoft_graph_plannerPlanDetails,
  microsoft_graph_plannerPlan,
  microsoft_graph_plannerGroup,
  microsoft_graph_settingValue,
  microsoft_graph_groupSetting,
  microsoft_graph_root,
  microsoft_graph_siteArchiveStatus,
  microsoft_graph_siteArchivalDetails,
  microsoft_graph_siteCollection,
  microsoft_graph_pageLayoutType,
  microsoft_graph_baseSitePage,
  microsoft_graph_sharePointIdentity,
  microsoft_graph_sharePointIdentitySet,
  microsoft_graph_sharingInvitation,
  microsoft_graph_sharingLink,
  microsoft_graph_permission,
  microsoft_graph_termStore_store,
  microsoft_graph_site,
  microsoft_graph_giphyRatingType,
  microsoft_graph_teamFunSettings,
  microsoft_graph_teamGuestSettings,
  microsoft_graph_teamMemberSettings,
  microsoft_graph_teamMessagingSettings,
  microsoft_graph_teamSpecialization,
  microsoft_graph_teamSummary,
  microsoft_graph_teamVisibilityType,
  microsoft_graph_channelMembershipType,
  microsoft_graph_channelSummary,
  microsoft_graph_conversationMember,
  microsoft_graph_chatMessageAttachment,
  microsoft_graph_channelIdentity,
  microsoft_graph_eventMessageDetail,
  microsoft_graph_chatMessageFromIdentitySet,
  microsoft_graph_chatMessageImportance,
  microsoft_graph_teamworkConversationIdentityType,
  microsoft_graph_teamworkConversationIdentity,
  microsoft_graph_chatMessageMentionedIdentitySet,
  microsoft_graph_chatMessageMention,
  microsoft_graph_chatMessageActions,
  microsoft_graph_chatMessageReactionIdentitySet,
  microsoft_graph_chatMessageReaction,
  microsoft_graph_chatMessageHistoryItem,
  microsoft_graph_chatMessageType,
  microsoft_graph_chatMessagePolicyViolationDlpActionTypes,
  microsoft_graph_chatMessagePolicyViolationPolicyTip,
  microsoft_graph_chatMessagePolicyViolationUserActionTypes,
  microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes,
  microsoft_graph_chatMessagePolicyViolation,
  microsoft_graph_teamworkHostedContent,
  microsoft_graph_chatMessageHostedContent,
  microsoft_graph_chatMessage,
  microsoft_graph_teamInfo,
  microsoft_graph_sharedWithChannelTeamInfo,
  microsoft_graph_teamsTabConfiguration,
  microsoft_graph_teamsAppDistributionMethod,
  microsoft_graph_teamsAppResourceSpecificPermissionType,
  microsoft_graph_teamsAppResourceSpecificPermission,
  microsoft_graph_teamsAppPermissionSet,
  microsoft_graph_teamsAppAuthorization,
  microsoft_graph_teamsAppPublishingState,
  microsoft_graph_teamworkBot,
  microsoft_graph_teamsAppDefinition,
  microsoft_graph_teamsApp,
  microsoft_graph_teamsTab,
  microsoft_graph_channel,
  microsoft_graph_teamsAppInstallation,
  microsoft_graph_operationError,
  microsoft_graph_teamsAsyncOperationType,
  microsoft_graph_teamsAsyncOperationStatus,
  microsoft_graph_teamsAsyncOperation,
  microsoft_graph_geoCoordinates,
  microsoft_graph_timeClockSettings,
  microsoft_graph_changeTrackedEntity,
  microsoft_graph_dayNote,
  microsoft_graph_scheduleChangeRequestActor,
  microsoft_graph_scheduleChangeState,
  microsoft_graph_scheduleChangeRequest,
  microsoft_graph_offerShiftRequest,
  microsoft_graph_openShiftChangeRequest,
  microsoft_graph_scheduleEntityTheme,
  microsoft_graph_scheduleEntity,
  microsoft_graph_shiftActivity,
  microsoft_graph_shiftItem,
  microsoft_graph_openShiftItem,
  microsoft_graph_openShift,
  microsoft_graph_schedulingGroup,
  microsoft_graph_shift,
  microsoft_graph_swapShiftsChangeRequest,
  microsoft_graph_timeCardEvent,
  microsoft_graph_timeCardBreak,
  microsoft_graph_confirmedBy,
  microsoft_graph_timeCardEntry,
  microsoft_graph_timeCardState,
  microsoft_graph_timeCard,
  microsoft_graph_timeOffReasonIconType,
  microsoft_graph_timeOffReason,
  microsoft_graph_timeOffRequest,
  microsoft_graph_timeOffItem,
  microsoft_graph_timeOff,
  microsoft_graph_schedule,
  microsoft_graph_teamworkTagType,
  microsoft_graph_teamworkTagMember,
  microsoft_graph_teamworkTag,
  microsoft_graph_teamsTemplate,
  microsoft_graph_team,
  microsoft_graph_group,
  microsoft_graph_printConnector,
  microsoft_graph_printer,
  microsoft_graph_printerShare,
  microsoft_graph_userPrint,
  microsoft_graph_provisionedPlan,
  microsoft_graph_signInActivity,
  microsoft_graph_status,
  microsoft_graph_imageInfo,
  microsoft_graph_visualInfo,
  microsoft_graph_activityHistoryItem,
  microsoft_graph_userActivity,
  microsoft_graph_agreementAcceptanceState,
  microsoft_graph_agreementAcceptance,
  microsoft_graph_authenticationMethod,
  microsoft_graph_emailAuthenticationMethod,
  microsoft_graph_attestationLevel,
  microsoft_graph_fido2AuthenticationMethod,
  microsoft_graph_alternativeSecurityId,
  microsoft_graph_device,
  microsoft_graph_microsoftAuthenticatorAuthenticationMethod,
  microsoft_graph_passwordAuthenticationMethod,
  microsoft_graph_authenticationPhoneType,
  microsoft_graph_authenticationMethodSignInState,
  microsoft_graph_phoneAuthenticationMethod,
  microsoft_graph_authenticationMethodKeyStrength,
  microsoft_graph_authenticationMethodPlatform,
  microsoft_graph_platformCredentialAuthenticationMethod,
  microsoft_graph_softwareOathAuthenticationMethod,
  microsoft_graph_temporaryAccessPassAuthenticationMethod,
  microsoft_graph_windowsHelloForBusinessAuthenticationMethod,
  microsoft_graph_authentication,
  microsoft_graph_calendarGroup,
  microsoft_graph_chatType,
  microsoft_graph_teamworkUserIdentityType,
  microsoft_graph_teamworkUserIdentity,
  microsoft_graph_teamworkOnlineMeetingInfo,
  microsoft_graph_chatViewpoint,
  microsoft_graph_chatMessageInfo,
  microsoft_graph_pinnedChatMessageInfo,
  microsoft_graph_chat,
  microsoft_graph_cloudClipboardItemPayload,
  microsoft_graph_cloudClipboardItem,
  microsoft_graph_cloudClipboardRoot,
  microsoft_graph_contact,
  microsoft_graph_contactFolder,
  microsoft_graph_deviceManagementTroubleshootingEvent,
  microsoft_graph_courseStatus,
  microsoft_graph_learningCourseActivity,
  microsoft_graph_employeeExperienceUser,
  microsoft_graph_inferenceClassificationType,
  microsoft_graph_inferenceClassificationOverride,
  microsoft_graph_inferenceClassification,
  microsoft_graph_insightIdentity,
  microsoft_graph_resourceReference,
  microsoft_graph_sharingDetail,
  microsoft_graph_resourceVisualization,
  microsoft_graph_sharedInsight,
  microsoft_graph_trending,
  microsoft_graph_usageDetails,
  microsoft_graph_usedInsight,
  microsoft_graph_officeGraphInsights,
  microsoft_graph_itemInsights,
  microsoft_graph_servicePlanInfo,
  microsoft_graph_licenseDetails,
  microsoft_graph_messageRuleActions,
  microsoft_graph_messageActionFlag,
  microsoft_graph_sizeRange,
  microsoft_graph_messageRulePredicates,
  microsoft_graph_messageRule,
  microsoft_graph_followupFlagStatus,
  microsoft_graph_followupFlag,
  microsoft_graph_internetMessageHeader,
  microsoft_graph_message,
  microsoft_graph_mailFolder,
  microsoft_graph_mobileAppIdentifier,
  microsoft_graph_managedAppFlaggedReason,
  microsoft_graph_managedAppPolicy,
  microsoft_graph_managedAppOperation,
  microsoft_graph_managedAppRegistration,
  microsoft_graph_complianceState,
  microsoft_graph_configurationManagerClientEnabledFeatures,
  microsoft_graph_actionState,
  microsoft_graph_deviceActionResult,
  microsoft_graph_deviceEnrollmentType,
  microsoft_graph_deviceHealthAttestationState,
  microsoft_graph_deviceRegistrationState,
  microsoft_graph_deviceManagementExchangeAccessState,
  microsoft_graph_deviceManagementExchangeAccessStateReason,
  microsoft_graph_managedDeviceOwnerType,
  microsoft_graph_managementAgentType,
  microsoft_graph_managedDevicePartnerReportedHealthState,
  microsoft_graph_deviceCategory,
  microsoft_graph_policyPlatformType,
  microsoft_graph_settingSourceType,
  microsoft_graph_settingSource,
  microsoft_graph_complianceStatus,
  microsoft_graph_deviceCompliancePolicySettingState,
  microsoft_graph_deviceCompliancePolicyState,
  microsoft_graph_deviceConfigurationSettingState,
  microsoft_graph_deviceConfigurationState,
  microsoft_graph_appLogUploadState,
  microsoft_graph_deviceLogCollectionResponse,
  microsoft_graph_windowsDeviceHealthState,
  microsoft_graph_windowsDefenderProductStatus,
  microsoft_graph_windowsMalwareCategory,
  microsoft_graph_windowsMalwareExecutionState,
  microsoft_graph_windowsMalwareSeverity,
  microsoft_graph_windowsMalwareState,
  microsoft_graph_windowsMalwareThreatState,
  microsoft_graph_windowsDeviceMalwareState,
  microsoft_graph_windowsProtectionState,
  microsoft_graph_managedDevice,
  microsoft_graph_oAuth2PermissionGrant,
  microsoft_graph_allowedLobbyAdmitterRoles,
  microsoft_graph_onlineMeetingPresenters,
  microsoft_graph_meetingLiveShareOptions,
  microsoft_graph_meetingChatMode,
  microsoft_graph_audioConferencing,
  microsoft_graph_chatInfo,
  microsoft_graph_chatRestrictions,
  microsoft_graph_joinMeetingIdSettings,
  microsoft_graph_lobbyBypassScope,
  microsoft_graph_lobbyBypassSettings,
  microsoft_graph_meetingChatHistoryDefaultMode,
  microsoft_graph_watermarkProtectionValues,
  microsoft_graph_virtualEventExternalInformation,
  microsoft_graph_attendanceInterval,
  microsoft_graph_virtualEventExternalRegistrationInformation,
  microsoft_graph_attendanceRecord,
  microsoft_graph_meetingAttendanceReport,
  microsoft_graph_onlineMeetingBase,
  microsoft_graph_broadcastMeetingAudience,
  microsoft_graph_broadcastMeetingCaptionSettings,
  microsoft_graph_broadcastMeetingSettings,
  microsoft_graph_onlineMeetingRole,
  microsoft_graph_meetingParticipantInfo,
  microsoft_graph_meetingParticipants,
  microsoft_graph_callRecording,
  microsoft_graph_callTranscript,
  microsoft_graph_onlineMeeting,
  microsoft_graph_categoryColor,
  microsoft_graph_outlookCategory,
  microsoft_graph_outlookUser,
  microsoft_graph_personType,
  microsoft_graph_selectionLikelihoodInfo,
  microsoft_graph_scoredEmailAddress,
  microsoft_graph_websiteType,
  microsoft_graph_website,
  microsoft_graph_person,
  microsoft_graph_plannerUser,
  microsoft_graph_presenceStatusMessage,
  microsoft_graph_presence,
  microsoft_graph_scopedRoleMembership,
  microsoft_graph_userInsightsSettings,
  microsoft_graph_timeRange,
  microsoft_graph_shiftAvailability,
  microsoft_graph_shiftPreferences,
  microsoft_graph_storageQuotaBreakdown,
  microsoft_graph_serviceStorageQuotaBreakdown,
  microsoft_graph_unifiedStorageQuota,
  microsoft_graph_userStorage,
  microsoft_graph_windowsSettingType,
  microsoft_graph_windowsSettingInstance,
  microsoft_graph_windowsSetting,
  microsoft_graph_userSettings,
  microsoft_graph_workingTimeSchedule,
  microsoft_graph_userSolutionRoot,
  microsoft_graph_associatedTeamInfo,
  microsoft_graph_userScopeTeamsAppInstallation,
  microsoft_graph_userTeamwork,
  microsoft_graph_wellknownListName,
  microsoft_graph_taskStatus,
  microsoft_graph_attachmentBase,
  microsoft_graph_attachmentSession,
  microsoft_graph_checklistItem,
  microsoft_graph_linkedResource,
  microsoft_graph_todoTask,
  microsoft_graph_todoTaskList,
  microsoft_graph_todo,
  microsoft_graph_user,
  microsoft_graph_baseItem,
  microsoft_graph_audio,
  microsoft_graph_album,
  microsoft_graph_bundle,
  microsoft_graph_deleted,
  microsoft_graph_hashes,
  microsoft_graph_file,
  microsoft_graph_fileSystemInfo,
  microsoft_graph_folderView,
  microsoft_graph_folder,
  microsoft_graph_image,
  microsoft_graph_malware,
  microsoft_graph_package,
  microsoft_graph_pendingContentUpdate,
  microsoft_graph_pendingOperations,
  microsoft_graph_photo,
  microsoft_graph_shared,
  microsoft_graph_specialFolder,
  microsoft_graph_video,
  microsoft_graph_remoteItem,
  microsoft_graph_searchResult,
  microsoft_graph_security_behaviorDuringRetentionPeriod,
  microsoft_graph_retentionLabelSettings,
  microsoft_graph_itemRetentionLabel,
  microsoft_graph_thumbnail,
  microsoft_graph_thumbnailSet,
  microsoft_graph_driveItemVersion,
  microsoft_graph_workbookApplication,
  microsoft_graph_workbookCommentReply,
  microsoft_graph_workbookComment,
  microsoft_graph_workbookFunctions,
  microsoft_graph_workbookChartFont,
  microsoft_graph_workbookChartLineFormat,
  microsoft_graph_workbookChartAxisFormat,
  microsoft_graph_workbookChartGridlinesFormat,
  microsoft_graph_workbookChartGridlines,
  microsoft_graph_workbookChartAxisTitleFormat,
  microsoft_graph_workbookChartAxisTitle,
  microsoft_graph_workbookChartAxis,
  microsoft_graph_workbookChartAxes,
  microsoft_graph_workbookChartFill,
  microsoft_graph_workbookChartDataLabelFormat,
  microsoft_graph_workbookChartDataLabels,
  microsoft_graph_workbookChartAreaFormat,
  microsoft_graph_workbookChartLegendFormat,
  microsoft_graph_workbookChartLegend,
  microsoft_graph_workbookChartSeriesFormat,
  microsoft_graph_workbookChartPointFormat,
  microsoft_graph_workbookChartPoint,
  microsoft_graph_workbookChartSeries,
  microsoft_graph_workbookChartTitleFormat,
  microsoft_graph_workbookChartTitle,
  microsoft_graph_workbookChart,
  microsoft_graph_workbookPivotTable,
  microsoft_graph_workbookWorksheetProtectionOptions,
  microsoft_graph_workbookWorksheetProtection,
  microsoft_graph_workbookIcon,
  microsoft_graph_workbookFilterCriteria,
  microsoft_graph_workbookFilter,
  microsoft_graph_workbookTableColumn,
  microsoft_graph_workbookTableRow,
  microsoft_graph_workbookSortField,
  microsoft_graph_workbookTableSort,
  microsoft_graph_workbookTable,
  microsoft_graph_workbookWorksheet,
  microsoft_graph_workbookNamedItem,
  microsoft_graph_workbookOperationError,
  microsoft_graph_workbookOperationStatus,
  microsoft_graph_workbookOperation,
  microsoft_graph_workbook,
  microsoft_graph_driveItem,
  microsoft_graph_driveItemCollectionResponse,
  microsoft_graph_workbookWorksheetCollectionResponse,
  create_excel_chart_Body,
  microsoft_graph_workbookRangeBorder,
  microsoft_graph_workbookRangeFill,
  microsoft_graph_workbookRangeFont,
  microsoft_graph_workbookFormatProtection,
  microsoft_graph_workbookRangeFormat,
  microsoft_graph_workbookRangeSort,
  microsoft_graph_workbookRange,
  microsoft_graph_calendarCollectionResponse,
  microsoft_graph_eventCollectionResponse,
  microsoft_graph_contactCollectionResponse,
  microsoft_graph_driveCollectionResponse,
  microsoft_graph_mailFolderCollectionResponse,
  microsoft_graph_messageCollectionResponse,
  send_mail_Body,
  microsoft_graph_notebookCollectionResponse,
  microsoft_graph_onenoteSectionCollectionResponse,
  microsoft_graph_onenotePageCollectionResponse,
  microsoft_graph_plannerTaskCollectionResponse,
  microsoft_graph_todoTaskListCollectionResponse,
  microsoft_graph_todoTaskCollectionResponse,
};

const endpoints = makeApi([
  {
    method: 'delete',
    path: '/drives/:driveId/items/:driveItemId',
    alias: 'delete-onedrive-file',
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/children',
    alias: 'list-folder-files',
    description: `Return a collection of DriveItems in the children relationship of a DriveItem. DriveItems with a non-null folder or package facet can have one or more child DriveItems.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_driveItemCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/children/:driveItemId1/content',
    alias: 'download-onedrive-file-content',
    description: `The content stream, if the item represents a file.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$format',
        type: 'Query',
        schema: z.string().describe('Format of the content').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved media content`,
        schema: z.void(),
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets',
    alias: 'list-excel-worksheets',
    description: `Represents a collection of worksheets associated with the workbook. Read-only.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_workbookWorksheetCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/charts/add',
    alias: 'create-excel-chart',
    description: `Creates a new chart.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_excel_chart_Body,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Success`,
        schema: z.union([microsoft_graph_workbookChart, z.object({}).partial().strict()]),
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range()/format',
    alias: 'format-excel-range',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_workbookRangeFormat,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Success`,
        schema: microsoft_graph_workbookRangeFormat,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range()/sort',
    alias: 'sort-excel-range',
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_workbookRangeSort,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Success`,
        schema: microsoft_graph_workbookRangeSort,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address&#x3D;&#x27;:address&#x27;)',
    alias: 'get-excel-range',
    requestFormat: 'json',
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Success`,
        schema: z.union([microsoft_graph_workbookRange, z.object({}).partial().strict()]),
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/drives/:driveId/root',
    alias: 'get-drive-root-item',
    description: `The root folder of the drive. Read-only.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved navigation property`,
        schema: microsoft_graph_driveItem,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me',
    alias: 'get-current-user',
    description: `Returns the user or organizational contact assigned as the user&#x27;s manager. Optionally, you can expand the manager&#x27;s chain up to the root node.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'ConsistencyLevel',
        type: 'Header',
        schema: z
          .string()
          .describe(
            'Indicates the requested consistency level. Documentation URL: https://docs.microsoft.com/graph/aad-advanced-queries'
          )
          .optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved entity`,
        schema: microsoft_graph_user,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/calendars',
    alias: 'list-calendars',
    description: `Get all the user&#x27;s calendars (/calendars navigation property), get the calendars from the default calendar group or from a specific calendar group.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_calendarCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/calendarView',
    alias: 'get-calendar-view',
    description: `Get the occurrences, exceptions, and single instances of events in a calendar view defined by a time range, from the user&#x27;s default calendar,
or from some other calendar of the user.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'startDateTime',
        type: 'Query',
        schema: z
          .string()
          .describe(
            'The start date and time of the time range, represented in ISO 8601 format. For example, 2019-11-08T19:00:00-08:00'
          ),
      },
      {
        name: 'endDateTime',
        type: 'Query',
        schema: z
          .string()
          .describe(
            'The end date and time of the time range, represented in ISO 8601 format. For example, 2019-11-08T20:00:00-08:00'
          ),
      },
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_eventCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/contacts',
    alias: 'list-outlook-contacts',
    description: `Get a contact collection from the default contacts folder of the signed-in user. There are two scenarios where an app can get contacts in another user&#x27;s contact folder:`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_contactCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'post',
    path: '/me/contacts',
    alias: 'create-outlook-contact',
    description: `Add a contact to the root Contacts folder or to the contacts endpoint of another contact folder.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_contact,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Created navigation property.`,
        schema: microsoft_graph_contact,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/contacts/:contactId',
    alias: 'get-outlook-contact',
    description: `Retrieve the properties and relationships of a contact object. There are two scenarios where an app can get a contact in another user&#x27;s contact folder:`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved navigation property`,
        schema: microsoft_graph_contact,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/me/contacts/:contactId',
    alias: 'update-outlook-contact',
    description: `Update the properties of a contact object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_contact,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Success`,
        schema: microsoft_graph_contact,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/me/contacts/:contactId',
    alias: 'delete-outlook-contact',
    description: `Delete a contact.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/drives',
    alias: 'list-drives',
    description: `Retrieve the list of Drive resources available for a target User, Group, or Site.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_driveCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/events',
    alias: 'list-calendar-events',
    description: `Get a list of event objects in the user&#x27;s mailbox. The list contains single
instance meetings and series masters. To get expanded event instances, you can get the calendar view, or
get the instances of an event. Currently, this operation returns event bodies in only HTML format. There are two scenarios where an app can get events in another user&#x27;s calendar:`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_eventCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'post',
    path: '/me/events',
    alias: 'create-calendar-event',
    description: `Create one or more multi-value extended properties in a new or existing instance of a resource. The following user resources are supported: The following group resources are supported: See Extended properties overview for more information about when to use
open extensions or extended properties, and how to specify extended properties.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_event,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Created navigation property.`,
        schema: microsoft_graph_event,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/events/:eventId',
    alias: 'get-calendar-event',
    description: `Get the properties and relationships of the specified event object. Currently, this operation returns event bodies in only HTML format. There are two scenarios where an app can get an event in another user&#x27;s calendar: Since the event resource supports extensions, you can also use the GET operation to get custom properties and extension data in an event instance.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved navigation property`,
        schema: microsoft_graph_event,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/me/events/:eventId',
    alias: 'update-calendar-event',
    description: `Update the properties of the event object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_event,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Success`,
        schema: microsoft_graph_event,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/me/events/:eventId',
    alias: 'delete-calendar-event',
    description: `Removes the specified event from the containing calendar.  If the event is a meeting, deleting the event on the organizer&#x27;s calendar sends a cancellation message to the meeting attendees.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/mailFolders',
    alias: 'list-mail-folders',
    description: `Get the mail folder collection directly under the root folder of the signed-in user. The returned collection includes any mail search folders directly under the root. By default, this operation does not return hidden folders. Use a query parameter includeHiddenFolders to include them in the response. This operation does not return all mail folders in a mailbox, only the child folders of the root folder. To return all mail folders in a mailbox, each child folder must be traversed separately.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'includeHiddenFolders',
        type: 'Query',
        schema: z.string().describe('Include Hidden Folders').optional(),
      },
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_mailFolderCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/mailFolders/:mailFolderId/messages',
    alias: 'list-mail-folder-messages',
    description: `Get all the messages in the specified user&#x27;s mailbox, or those messages in a specified folder in the mailbox.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_messageCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/messages',
    alias: 'list-mail-messages',
    description: `Get the messages in the signed-in user&#x27;s mailbox (including the Deleted Items and Clutter folders). Depending on the page size and mailbox data, getting messages from a mailbox can incur multiple requests. The default page size is 10 messages. Use $top to customize the page size, within the range of 1 and 1000. To improve the operation response time, use $select to specify the exact properties you need; see example 1 below. Fine-tune the values for $select and $top, especially when you must use a larger page size, as returning a page with hundreds of messages each with a full response payload may trigger the gateway timeout (HTTP 504). To get the next page of messages, simply apply the entire URL returned in @odata.nextLink to the next get-messages request. This URL includes any query parameters you may have specified in the initial request. Do not try to extract the $skip value from the @odata.nextLink URL to manipulate responses. This API uses the $skip value to keep count of all the items it has gone through in the user&#x27;s mailbox to return a page of message-type items. It&#x27;s therefore possible that even in the initial response, the $skip value is larger than the page size. For more information, see Paging Microsoft Graph data in your app. Currently, this operation returns message bodies in only HTML format. There are two scenarios where an app can get messages in another user&#x27;s mail folder:`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'includeHiddenMessages',
        type: 'Query',
        schema: z.string().describe('Include Hidden Messages').optional(),
      },
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_messageCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/messages/:messageId',
    alias: 'get-mail-message',
    description: `Get an open extension (openTypeExtension object) identified by name or fully qualified name. The table in the Permissions section lists the resources that support open extensions. The following table lists the three scenarios where you can get an open extension from a supported resource instance.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved navigation property`,
        schema: microsoft_graph_message,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/me/messages/:messageId',
    alias: 'delete-mail-message',
    description: `Delete a message in the specified user&#x27;s mailbox, or delete a relationship of the message.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/onenote/notebooks',
    alias: 'list-onenote-notebooks',
    description: `Retrieve a list of notebook objects.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_notebookCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/onenote/notebooks/:notebookId/sections',
    alias: 'list-onenote-notebook-sections',
    description: `Retrieve a list of onenoteSection objects from the specified notebook.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_onenoteSectionCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'post',
    path: '/me/onenote/pages',
    alias: 'create-onenote-page',
    description: `Create a new OneNote page in the default section of the default notebook. To create a page in a different section in the default notebook, you can use the sectionName query parameter.  Example: ../onenote/pages?sectionName&#x3D;My%20section The POST /onenote/pages operation is used only to create pages in the current user&#x27;s default notebook. If you&#x27;re targeting other notebooks, you can create pages in a specified section.  `,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_onenotePage,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Created navigation property.`,
        schema: microsoft_graph_onenotePage,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/onenote/pages/:onenotePageId/content',
    alias: 'get-onenote-page-content',
    description: `The page&#x27;s HTML content.`,
    requestFormat: 'json',
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved media content`,
        schema: z.void(),
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/onenote/sections/:onenoteSectionId/pages',
    alias: 'list-onenote-section-pages',
    description: `Retrieve a list of page objects from the specified section.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_onenotePageCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/planner/tasks',
    alias: 'list-planner-tasks',
    description: `Retrieve a list of plannertask objects assigned to a User.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_plannerTaskCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'post',
    path: '/me/sendMail',
    alias: 'send-mail',
    description: `Send the message specified in the request body using either JSON or MIME format. When using JSON format, you can include a file attachment in the same sendMail action call. When using MIME format: This method saves the message in the Sent Items folder. Alternatively, create a draft message to send later. To learn more about the steps involved in the backend before a mail is delivered to recipients, see here.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: send_mail_Body,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/todo/lists',
    alias: 'list-todo-task-lists',
    description: `Get a list of the todoTaskList objects and their properties.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_todoTaskListCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/todo/lists/:todoTaskListId/tasks',
    alias: 'list-todo-tasks',
    description: `Get the todoTask resources from the tasks navigation property of a specified todoTaskList.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_todoTaskCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'post',
    path: '/me/todo/lists/:todoTaskListId/tasks',
    alias: 'create-todo-task',
    description: `Create a new task object in a specified todoTaskList.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_todoTask,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Created navigation property.`,
        schema: microsoft_graph_todoTask,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/me/todo/lists/:todoTaskListId/tasks/:todoTaskId',
    alias: 'get-todo-task',
    description: `Read the properties and relationships of a todoTask object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved navigation property`,
        schema: microsoft_graph_todoTask,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'patch',
    path: '/me/todo/lists/:todoTaskListId/tasks/:todoTaskId',
    alias: 'update-todo-task',
    description: `Update the properties of a todoTask object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_todoTask,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Success`,
        schema: microsoft_graph_todoTask,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'delete',
    path: '/me/todo/lists/:todoTaskListId/tasks/:todoTaskId',
    alias: 'delete-todo-task',
    description: `Deletes a todoTask object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/planner/plans/:plannerPlanId',
    alias: 'get-planner-plan',
    description: `Retrieve the properties and relationships of a plannerplan object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved navigation property`,
        schema: microsoft_graph_plannerPlan,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/planner/plans/:plannerPlanId/tasks',
    alias: 'list-plan-tasks',
    description: `Retrieve a list of plannerTask objects associated with a plannerPlan object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Skip the first n items').optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().describe('Search items by search phrases').optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().describe('Filter items by property values').optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().describe('Include count of items').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved collection`,
        schema: microsoft_graph_plannerTaskCollectionResponse,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'post',
    path: '/planner/tasks',
    alias: 'create-planner-task',
    description: `Create a new plannerTask.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_plannerTask,
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Created navigation property.`,
        schema: microsoft_graph_plannerTask,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
  {
    method: 'get',
    path: '/planner/tasks/:plannerTaskId',
    alias: 'get-planner-task',
    description: `Retrieve the properties and relationships of plannerTask object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void(),
    errors: [
      {
        status: NaN,
        description: `Retrieved navigation property`,
        schema: microsoft_graph_plannerTask,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
      {
        status: NaN,
        description: `error`,
        schema: microsoft_graph_ODataErrors_ODataError,
      },
    ],
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
