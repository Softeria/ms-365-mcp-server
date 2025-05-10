import { makeApi, Zodios, type ZodiosOptions } from '@zodios/core';
import { z } from 'zod';

type microsoft_graph_accessPackage = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isHidden?: (boolean | null) | undefined;
  modifiedDateTime?: (string | null) | undefined;
  accessPackagesIncompatibleWith?: Array<microsoft_graph_accessPackage> | undefined;
  assignmentPolicies?: Array<microsoft_graph_accessPackageAssignmentPolicy> | undefined;
  catalog?:
    | (
        | (microsoft_graph_accessPackageCatalog | {})
        | Array<microsoft_graph_accessPackageCatalog | {}>
      )
    | undefined;
  incompatibleAccessPackages?: Array<microsoft_graph_accessPackage> | undefined;
  incompatibleGroups?: Array<microsoft_graph_group> | undefined;
  resourceRoleScopes?: Array<microsoft_graph_accessPackageResourceRoleScope> | undefined;
  '@odata.type': string;
};
type microsoft_graph_entity = {
  id?: string | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_accessPackageAutomaticRequestSettings = {
  gracePeriodBeforeAccessRemoval?: (string | null) | undefined;
  removeAccessWhenTargetLeavesAllowedTargets?: (boolean | null) | undefined;
  requestAccessForAllowedTargets?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_expirationPattern = {
  duration?: (string | null) | undefined;
  endDateTime?: (string | null) | undefined;
  type?:
    | (
        | (microsoft_graph_expirationPatternType | {})
        | Array<microsoft_graph_expirationPatternType | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_expirationPatternType =
  | 'notSpecified'
  | 'noExpiration'
  | 'afterDateTime'
  | 'afterDuration';
type microsoft_graph_accessPackageNotificationSettings = {
  isAssignmentNotificationDisabled?: boolean | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageAssignmentApprovalSettings = {
  isApprovalRequiredForAdd?: (boolean | null) | undefined;
  isApprovalRequiredForUpdate?: (boolean | null) | undefined;
  isRequestorJustificationRequired?: (boolean | null) | undefined;
  stages?: Array<microsoft_graph_accessPackageApprovalStage> | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageApprovalStage = {
  durationBeforeAutomaticDenial?: (string | null) | undefined;
  durationBeforeEscalation?: (string | null) | undefined;
  escalationApprovers?: Array<microsoft_graph_subjectSet> | undefined;
  fallbackEscalationApprovers?: Array<microsoft_graph_subjectSet> | undefined;
  fallbackPrimaryApprovers?: Array<microsoft_graph_subjectSet> | undefined;
  isApproverJustificationRequired?: (boolean | null) | undefined;
  isEscalationEnabled?: (boolean | null) | undefined;
  primaryApprovers?: Array<microsoft_graph_subjectSet> | undefined;
  '@odata.type': string;
};
type microsoft_graph_subjectSet = {
  '@odata.type': string;
};
type microsoft_graph_accessPackageAssignmentRequestorSettings = {
  allowCustomAssignmentSchedule?: (boolean | null) | undefined;
  enableOnBehalfRequestorsToAddAccess?: (boolean | null) | undefined;
  enableOnBehalfRequestorsToRemoveAccess?: (boolean | null) | undefined;
  enableOnBehalfRequestorsToUpdateAccess?: (boolean | null) | undefined;
  enableTargetsToSelfAddAccess?: (boolean | null) | undefined;
  enableTargetsToSelfRemoveAccess?: (boolean | null) | undefined;
  enableTargetsToSelfUpdateAccess?: (boolean | null) | undefined;
  onBehalfRequestors?: Array<microsoft_graph_subjectSet> | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageAssignmentReviewSettings = {
  expirationBehavior?:
    | (
        | (microsoft_graph_accessReviewExpirationBehavior | {})
        | Array<microsoft_graph_accessReviewExpirationBehavior | {}>
      )
    | undefined;
  fallbackReviewers?: Array<microsoft_graph_subjectSet> | undefined;
  isEnabled?: (boolean | null) | undefined;
  isRecommendationEnabled?: (boolean | null) | undefined;
  isReviewerJustificationRequired?: (boolean | null) | undefined;
  isSelfReview?: (boolean | null) | undefined;
  primaryReviewers?: Array<microsoft_graph_subjectSet> | undefined;
  schedule?:
    | (
        | (microsoft_graph_entitlementManagementSchedule | {})
        | Array<microsoft_graph_entitlementManagementSchedule | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessReviewExpirationBehavior =
  | 'keepAccess'
  | 'removeAccess'
  | 'acceptAccessRecommendation'
  | 'unknownFutureValue';
type microsoft_graph_entitlementManagementSchedule = {
  expiration?:
    | ((microsoft_graph_expirationPattern | {}) | Array<microsoft_graph_expirationPattern | {}>)
    | undefined;
  recurrence?:
    | ((microsoft_graph_patternedRecurrence | {}) | Array<microsoft_graph_patternedRecurrence | {}>)
    | undefined;
  startDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_patternedRecurrence = {
  pattern?:
    | ((microsoft_graph_recurrencePattern | {}) | Array<microsoft_graph_recurrencePattern | {}>)
    | undefined;
  range?:
    | ((microsoft_graph_recurrenceRange | {}) | Array<microsoft_graph_recurrenceRange | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_recurrencePattern = {
  dayOfMonth?: number | undefined;
  daysOfWeek?:
    | Array<(microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>>
    | undefined;
  firstDayOfWeek?:
    | ((microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>)
    | undefined;
  index?: ((microsoft_graph_weekIndex | {}) | Array<microsoft_graph_weekIndex | {}>) | undefined;
  interval?: number | undefined;
  month?: number | undefined;
  type?:
    | (
        | (microsoft_graph_recurrencePatternType | {})
        | Array<microsoft_graph_recurrencePatternType | {}>
      )
    | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_recurrenceRange = {
  endDate?: (string | null) | undefined;
  numberOfOccurrences?: number | undefined;
  recurrenceTimeZone?: (string | null) | undefined;
  startDate?: (string | null) | undefined;
  type?:
    | ((microsoft_graph_recurrenceRangeType | {}) | Array<microsoft_graph_recurrenceRangeType | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_recurrenceRangeType = 'endDate' | 'noEnd' | 'numbered';
type microsoft_graph_accessPackageCatalogType =
  | 'userManaged'
  | 'serviceDefault'
  | 'serviceManaged'
  | 'unknownFutureValue';
type microsoft_graph_accessPackageCatalogState = 'unpublished' | 'published' | 'unknownFutureValue';
type microsoft_graph_customCalloutExtension = microsoft_graph_entity & {
  authenticationConfiguration?:
    | (
        | (microsoft_graph_customExtensionAuthenticationConfiguration | {})
        | Array<microsoft_graph_customExtensionAuthenticationConfiguration | {}>
      )
    | undefined;
  clientConfiguration?:
    | (
        | (microsoft_graph_customExtensionClientConfiguration | {})
        | Array<microsoft_graph_customExtensionClientConfiguration | {}>
      )
    | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  endpointConfiguration?:
    | (
        | (microsoft_graph_customExtensionEndpointConfiguration | {})
        | Array<microsoft_graph_customExtensionEndpointConfiguration | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_customExtensionAuthenticationConfiguration = {
  '@odata.type': string;
};
type microsoft_graph_customExtensionClientConfiguration = {
  maximumRetries?: (number | null) | undefined;
  timeoutInMilliseconds?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_customExtensionEndpointConfiguration = {
  '@odata.type': string;
};
type microsoft_graph_accessPackageResourceAttribute = {
  destination?:
    | (
        | (microsoft_graph_accessPackageResourceAttributeDestination | {})
        | Array<microsoft_graph_accessPackageResourceAttributeDestination | {}>
      )
    | undefined;
  isEditable?: (boolean | null) | undefined;
  isPersistedOnAssignmentRemoval?: (boolean | null) | undefined;
  name?: (string | null) | undefined;
  source?:
    | (
        | (microsoft_graph_accessPackageResourceAttributeSource | {})
        | Array<microsoft_graph_accessPackageResourceAttributeSource | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageResourceAttributeDestination = {
  '@odata.type': string;
};
type microsoft_graph_accessPackageResourceAttributeSource = {
  '@odata.type': string;
};
type microsoft_graph_connectionInfo = {
  url?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_customExtensionStageSetting = microsoft_graph_entity & {
  stage?: microsoft_graph_accessPackageCustomExtensionStage | undefined;
  customExtension?:
    | (
        | (microsoft_graph_customCalloutExtension | {})
        | Array<microsoft_graph_customCalloutExtension | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageCustomExtensionStage =
  | 'assignmentRequestCreated'
  | 'assignmentRequestApproved'
  | 'assignmentRequestGranted'
  | 'assignmentRequestRemoved'
  | 'assignmentFourteenDaysBeforeExpiration'
  | 'assignmentOneDayBeforeExpiration'
  | 'unknownFutureValue';
type microsoft_graph_accessPackageQuestion = microsoft_graph_entity & {
  isAnswerEditable?: (boolean | null) | undefined;
  isRequired?: (boolean | null) | undefined;
  localizations?: Array<microsoft_graph_accessPackageLocalizedText> | undefined;
  sequence?: (number | null) | undefined;
  text?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageLocalizedText = {
  languageCode?: string | undefined;
  text?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_directoryObject = microsoft_graph_entity & {
  deletedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_assignedLabel = {
  displayName?: (string | null) | undefined;
  labelId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_assignedLicense = {
  disabledPlans?: Array<string> | undefined;
  skuId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_licenseProcessingState = {
  state?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onPremisesProvisioningError = {
  category?: (string | null) | undefined;
  occurredDateTime?: (string | null) | undefined;
  propertyCausingError?: (string | null) | undefined;
  value?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_serviceProvisioningError = {
  createdDateTime?: (string | null) | undefined;
  isResolved?: (boolean | null) | undefined;
  serviceInstance?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_appRoleAssignment = microsoft_graph_directoryObject & {
  appRoleId?: string | undefined;
  createdDateTime?: (string | null) | undefined;
  principalDisplayName?: (string | null) | undefined;
  principalId?: (string | null) | undefined;
  principalType?: (string | null) | undefined;
  resourceDisplayName?: (string | null) | undefined;
  resourceId?: (string | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_emailAddress = {
  address?: (string | null) | undefined;
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_calendarPermission = microsoft_graph_entity & {
  allowedRoles?:
    | Array<(microsoft_graph_calendarRoleType | {}) | Array<microsoft_graph_calendarRoleType | {}>>
    | undefined;
  emailAddress?:
    | ((microsoft_graph_emailAddress | {}) | Array<microsoft_graph_emailAddress | {}>)
    | undefined;
  isInsideOrganization?: (boolean | null) | undefined;
  isRemovable?: (boolean | null) | undefined;
  role?:
    | ((microsoft_graph_calendarRoleType | {}) | Array<microsoft_graph_calendarRoleType | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_calendarRoleType =
  | 'none'
  | 'freeBusyRead'
  | 'limitedRead'
  | 'read'
  | 'write'
  | 'delegateWithoutPrivateEventAccess'
  | 'delegateWithPrivateEventAccess'
  | 'custom';
type microsoft_graph_outlookItem = microsoft_graph_entity & {
  categories?: Array<string | null> | undefined;
  changeKey?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_attendee = microsoft_graph_attendeeBase & {
  proposedNewTime?:
    | ((microsoft_graph_timeSlot | {}) | Array<microsoft_graph_timeSlot | {}>)
    | undefined;
  status?:
    | ((microsoft_graph_responseStatus | {}) | Array<microsoft_graph_responseStatus | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_attendeeBase = microsoft_graph_recipient & {
  type?:
    | ((microsoft_graph_attendeeType | {}) | Array<microsoft_graph_attendeeType | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_recipient = {
  emailAddress?:
    | ((microsoft_graph_emailAddress | {}) | Array<microsoft_graph_emailAddress | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_attendeeType = 'required' | 'optional' | 'resource';
type microsoft_graph_timeSlot = {
  end?: microsoft_graph_dateTimeTimeZone | undefined;
  start?: microsoft_graph_dateTimeTimeZone | undefined;
  '@odata.type': string;
};
type microsoft_graph_dateTimeTimeZone = {
  dateTime?: string | undefined;
  timeZone?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_responseStatus = {
  response?:
    | ((microsoft_graph_responseType | {}) | Array<microsoft_graph_responseType | {}>)
    | undefined;
  time?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_responseType =
  | 'none'
  | 'organizer'
  | 'tentativelyAccepted'
  | 'accepted'
  | 'declined'
  | 'notResponded';
type microsoft_graph_itemBody = {
  content?: (string | null) | undefined;
  contentType?:
    | ((microsoft_graph_bodyType | {}) | Array<microsoft_graph_bodyType | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_bodyType = 'text' | 'html';
type microsoft_graph_importance = 'low' | 'normal' | 'high';
type microsoft_graph_location = {
  address?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  coordinates?:
    | (
        | (microsoft_graph_outlookGeoCoordinates | {})
        | Array<microsoft_graph_outlookGeoCoordinates | {}>
      )
    | undefined;
  displayName?: (string | null) | undefined;
  locationEmailAddress?: (string | null) | undefined;
  locationType?:
    | ((microsoft_graph_locationType | {}) | Array<microsoft_graph_locationType | {}>)
    | undefined;
  locationUri?: (string | null) | undefined;
  uniqueId?: (string | null) | undefined;
  uniqueIdType?:
    | (
        | (microsoft_graph_locationUniqueIdType | {})
        | Array<microsoft_graph_locationUniqueIdType | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_physicalAddress = {
  city?: (string | null) | undefined;
  countryOrRegion?: (string | null) | undefined;
  postalCode?: (string | null) | undefined;
  state?: (string | null) | undefined;
  street?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_outlookGeoCoordinates = {
  accuracy?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  altitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  altitudeAccuracy?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  latitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  longitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_onlineMeetingInfo = {
  conferenceId?: (string | null) | undefined;
  joinUrl?: (string | null) | undefined;
  phones?: Array<microsoft_graph_phone> | undefined;
  quickDial?: (string | null) | undefined;
  tollFreeNumbers?: Array<string | null> | undefined;
  tollNumber?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_phone = {
  language?: (string | null) | undefined;
  number?: (string | null) | undefined;
  region?: (string | null) | undefined;
  type?: ((microsoft_graph_phoneType | {}) | Array<microsoft_graph_phoneType | {}>) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_attachment = microsoft_graph_entity & {
  contentType?: (string | null) | undefined;
  isInline?: boolean | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  name?: (string | null) | undefined;
  size?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_extension = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_multiValueLegacyExtendedProperty = microsoft_graph_entity & {
  value?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_singleValueLegacyExtendedProperty = microsoft_graph_entity & {
  value?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_conversation = microsoft_graph_entity & {
  hasAttachments?: boolean | undefined;
  lastDeliveredDateTime?: string | undefined;
  preview?: string | undefined;
  topic?: string | undefined;
  uniqueSenders?: Array<string> | undefined;
  threads?: Array<microsoft_graph_conversationThread> | undefined;
  '@odata.type': string;
};
type microsoft_graph_conversationThread = microsoft_graph_entity & {
  ccRecipients?: Array<microsoft_graph_recipient> | undefined;
  hasAttachments?: boolean | undefined;
  isLocked?: boolean | undefined;
  lastDeliveredDateTime?: string | undefined;
  preview?: string | undefined;
  topic?: string | undefined;
  toRecipients?: Array<microsoft_graph_recipient> | undefined;
  uniqueSenders?: Array<string> | undefined;
  posts?: Array<microsoft_graph_post> | undefined;
  '@odata.type': string;
};
type microsoft_graph_identitySet = {
  application?:
    | ((microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>)
    | undefined;
  device?: ((microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>) | undefined;
  user?: ((microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_identity = {
  displayName?: (string | null) | undefined;
  id?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_itemReference = {
  driveId?: (string | null) | undefined;
  driveType?: (string | null) | undefined;
  id?: (string | null) | undefined;
  name?: (string | null) | undefined;
  path?: (string | null) | undefined;
  shareId?: (string | null) | undefined;
  sharepointIds?:
    | ((microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>)
    | undefined;
  siteId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharepointIds = {
  listId?: (string | null) | undefined;
  listItemId?: (string | null) | undefined;
  listItemUniqueId?: (string | null) | undefined;
  siteId?: (string | null) | undefined;
  siteUrl?: (string | null) | undefined;
  tenantId?: (string | null) | undefined;
  webId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_assignedPlan = {
  assignedDateTime?: (string | null) | undefined;
  capabilityStatus?: (string | null) | undefined;
  service?: (string | null) | undefined;
  servicePlanId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_authorizationInfo = {
  certificateUserIds?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_customSecurityAttributeValue = {
  '@odata.type': string;
};
type microsoft_graph_employeeOrgData = {
  costCenter?: (string | null) | undefined;
  division?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_objectIdentity = {
  issuer?: (string | null) | undefined;
  issuerAssignedId?: (string | null) | undefined;
  signInType?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_licenseAssignmentState = {
  assignedByGroup?: (string | null) | undefined;
  disabledPlans?: Array<string | null> | undefined;
  error?: (string | null) | undefined;
  lastUpdatedDateTime?: (string | null) | undefined;
  skuId?: (string | null) | undefined;
  state?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_mailboxSettings = {
  archiveFolder?: (string | null) | undefined;
  automaticRepliesSetting?:
    | (
        | (microsoft_graph_automaticRepliesSetting | {})
        | Array<microsoft_graph_automaticRepliesSetting | {}>
      )
    | undefined;
  dateFormat?: (string | null) | undefined;
  delegateMeetingMessageDeliveryOptions?:
    | (
        | (microsoft_graph_delegateMeetingMessageDeliveryOptions | {})
        | Array<microsoft_graph_delegateMeetingMessageDeliveryOptions | {}>
      )
    | undefined;
  language?:
    | ((microsoft_graph_localeInfo | {}) | Array<microsoft_graph_localeInfo | {}>)
    | undefined;
  timeFormat?: (string | null) | undefined;
  timeZone?: (string | null) | undefined;
  userPurpose?:
    | ((microsoft_graph_userPurpose | {}) | Array<microsoft_graph_userPurpose | {}>)
    | undefined;
  workingHours?:
    | ((microsoft_graph_workingHours | {}) | Array<microsoft_graph_workingHours | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_automaticRepliesSetting = {
  externalAudience?:
    | (
        | (microsoft_graph_externalAudienceScope | {})
        | Array<microsoft_graph_externalAudienceScope | {}>
      )
    | undefined;
  externalReplyMessage?: (string | null) | undefined;
  internalReplyMessage?: (string | null) | undefined;
  scheduledEndDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  scheduledStartDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  status?:
    | (
        | (microsoft_graph_automaticRepliesStatus | {})
        | Array<microsoft_graph_automaticRepliesStatus | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_externalAudienceScope = 'none' | 'contactsOnly' | 'all';
type microsoft_graph_automaticRepliesStatus = 'disabled' | 'alwaysEnabled' | 'scheduled';
type microsoft_graph_delegateMeetingMessageDeliveryOptions =
  | 'sendToDelegateAndInformationToPrincipal'
  | 'sendToDelegateAndPrincipal'
  | 'sendToDelegateOnly';
type microsoft_graph_localeInfo = {
  displayName?: (string | null) | undefined;
  locale?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_userPurpose =
  | 'user'
  | 'linked'
  | 'shared'
  | 'room'
  | 'equipment'
  | 'others'
  | 'unknownFutureValue';
type microsoft_graph_workingHours = {
  daysOfWeek?:
    | Array<(microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>>
    | undefined;
  endTime?: (string | null) | undefined;
  startTime?: (string | null) | undefined;
  timeZone?:
    | ((microsoft_graph_timeZoneBase | {}) | Array<microsoft_graph_timeZoneBase | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeZoneBase = {
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onPremisesExtensionAttributes = {
  extensionAttribute1?: (string | null) | undefined;
  extensionAttribute10?: (string | null) | undefined;
  extensionAttribute11?: (string | null) | undefined;
  extensionAttribute12?: (string | null) | undefined;
  extensionAttribute13?: (string | null) | undefined;
  extensionAttribute14?: (string | null) | undefined;
  extensionAttribute15?: (string | null) | undefined;
  extensionAttribute2?: (string | null) | undefined;
  extensionAttribute3?: (string | null) | undefined;
  extensionAttribute4?: (string | null) | undefined;
  extensionAttribute5?: (string | null) | undefined;
  extensionAttribute6?: (string | null) | undefined;
  extensionAttribute7?: (string | null) | undefined;
  extensionAttribute8?: (string | null) | undefined;
  extensionAttribute9?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_passwordProfile = {
  forceChangePasswordNextSignIn?: (boolean | null) | undefined;
  forceChangePasswordNextSignInWithMfa?: (boolean | null) | undefined;
  password?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_printerBase = microsoft_graph_entity & {
  capabilities?:
    | ((microsoft_graph_printerCapabilities | {}) | Array<microsoft_graph_printerCapabilities | {}>)
    | undefined;
  defaults?:
    | ((microsoft_graph_printerDefaults | {}) | Array<microsoft_graph_printerDefaults | {}>)
    | undefined;
  displayName?: string | undefined;
  isAcceptingJobs?: (boolean | null) | undefined;
  location?:
    | ((microsoft_graph_printerLocation | {}) | Array<microsoft_graph_printerLocation | {}>)
    | undefined;
  manufacturer?: (string | null) | undefined;
  model?: (string | null) | undefined;
  status?: microsoft_graph_printerStatus | undefined;
  jobs?: Array<microsoft_graph_printJob> | undefined;
  '@odata.type': string;
};
type microsoft_graph_printerCapabilities = {
  bottomMargins?: Array<number | null> | undefined;
  collation?: (boolean | null) | undefined;
  colorModes?:
    | Array<(microsoft_graph_printColorMode | {}) | Array<microsoft_graph_printColorMode | {}>>
    | undefined;
  contentTypes?: Array<string | null> | undefined;
  copiesPerJob?:
    | ((microsoft_graph_integerRange | {}) | Array<microsoft_graph_integerRange | {}>)
    | undefined;
  dpis?: Array<number | null> | undefined;
  duplexModes?:
    | Array<(microsoft_graph_printDuplexMode | {}) | Array<microsoft_graph_printDuplexMode | {}>>
    | undefined;
  feedOrientations?:
    | Array<
        | (microsoft_graph_printerFeedOrientation | {})
        | Array<microsoft_graph_printerFeedOrientation | {}>
      >
    | undefined;
  finishings?:
    | Array<(microsoft_graph_printFinishing | {}) | Array<microsoft_graph_printFinishing | {}>>
    | undefined;
  inputBins?: Array<string | null> | undefined;
  isColorPrintingSupported?: (boolean | null) | undefined;
  isPageRangeSupported?: (boolean | null) | undefined;
  leftMargins?: Array<number | null> | undefined;
  mediaColors?: Array<string | null> | undefined;
  mediaSizes?: Array<string | null> | undefined;
  mediaTypes?: Array<string | null> | undefined;
  multipageLayouts?:
    | Array<
        | (microsoft_graph_printMultipageLayout | {})
        | Array<microsoft_graph_printMultipageLayout | {}>
      >
    | undefined;
  orientations?:
    | Array<(microsoft_graph_printOrientation | {}) | Array<microsoft_graph_printOrientation | {}>>
    | undefined;
  outputBins?: Array<string | null> | undefined;
  pagesPerSheet?: Array<number | null> | undefined;
  qualities?:
    | Array<(microsoft_graph_printQuality | {}) | Array<microsoft_graph_printQuality | {}>>
    | undefined;
  rightMargins?: Array<number | null> | undefined;
  scalings?:
    | Array<(microsoft_graph_printScaling | {}) | Array<microsoft_graph_printScaling | {}>>
    | undefined;
  supportsFitPdfToPage?: (boolean | null) | undefined;
  topMargins?: Array<number | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_printColorMode =
  | 'blackAndWhite'
  | 'grayscale'
  | 'color'
  | 'auto'
  | 'unknownFutureValue';
type microsoft_graph_integerRange = {
  end?: (number | null) | undefined;
  start?: (number | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_printerDefaults = {
  colorMode?:
    | ((microsoft_graph_printColorMode | {}) | Array<microsoft_graph_printColorMode | {}>)
    | undefined;
  contentType?: (string | null) | undefined;
  copiesPerJob?: (number | null) | undefined;
  dpi?: (number | null) | undefined;
  duplexMode?:
    | ((microsoft_graph_printDuplexMode | {}) | Array<microsoft_graph_printDuplexMode | {}>)
    | undefined;
  finishings?:
    | Array<(microsoft_graph_printFinishing | {}) | Array<microsoft_graph_printFinishing | {}>>
    | undefined;
  fitPdfToPage?: (boolean | null) | undefined;
  inputBin?: (string | null) | undefined;
  mediaColor?: (string | null) | undefined;
  mediaSize?: (string | null) | undefined;
  mediaType?: (string | null) | undefined;
  multipageLayout?:
    | (
        | (microsoft_graph_printMultipageLayout | {})
        | Array<microsoft_graph_printMultipageLayout | {}>
      )
    | undefined;
  orientation?:
    | ((microsoft_graph_printOrientation | {}) | Array<microsoft_graph_printOrientation | {}>)
    | undefined;
  outputBin?: (string | null) | undefined;
  pagesPerSheet?: (number | null) | undefined;
  quality?:
    | ((microsoft_graph_printQuality | {}) | Array<microsoft_graph_printQuality | {}>)
    | undefined;
  scaling?:
    | ((microsoft_graph_printScaling | {}) | Array<microsoft_graph_printScaling | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_printerLocation = {
  altitudeInMeters?: (number | null) | undefined;
  building?: (string | null) | undefined;
  city?: (string | null) | undefined;
  countryOrRegion?: (string | null) | undefined;
  floor?: (string | null) | undefined;
  floorDescription?: (string | null) | undefined;
  latitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  longitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  organization?: Array<string | null> | undefined;
  postalCode?: (string | null) | undefined;
  roomDescription?: (string | null) | undefined;
  roomName?: (string | null) | undefined;
  site?: (string | null) | undefined;
  stateOrProvince?: (string | null) | undefined;
  streetAddress?: (string | null) | undefined;
  subdivision?: Array<string | null> | undefined;
  subunit?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_printerStatus = {
  description?: (string | null) | undefined;
  details?: Array<microsoft_graph_printerProcessingStateDetail> | undefined;
  state?: microsoft_graph_printerProcessingState | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_printJob = microsoft_graph_entity & {
  acknowledgedDateTime?: (string | null) | undefined;
  configuration?: microsoft_graph_printJobConfiguration | undefined;
  createdBy?:
    | ((microsoft_graph_userIdentity | {}) | Array<microsoft_graph_userIdentity | {}>)
    | undefined;
  createdDateTime?: string | undefined;
  errorCode?: (number | null) | undefined;
  isFetchable?: boolean | undefined;
  redirectedFrom?: (string | null) | undefined;
  redirectedTo?: (string | null) | undefined;
  status?: microsoft_graph_printJobStatus | undefined;
  documents?: Array<microsoft_graph_printDocument> | undefined;
  tasks?: Array<microsoft_graph_printTask> | undefined;
  '@odata.type': string;
};
type microsoft_graph_printJobConfiguration = {
  collate?: (boolean | null) | undefined;
  colorMode?:
    | ((microsoft_graph_printColorMode | {}) | Array<microsoft_graph_printColorMode | {}>)
    | undefined;
  copies?: (number | null) | undefined;
  dpi?: (number | null) | undefined;
  duplexMode?:
    | ((microsoft_graph_printDuplexMode | {}) | Array<microsoft_graph_printDuplexMode | {}>)
    | undefined;
  feedOrientation?:
    | (
        | (microsoft_graph_printerFeedOrientation | {})
        | Array<microsoft_graph_printerFeedOrientation | {}>
      )
    | undefined;
  finishings?:
    | Array<(microsoft_graph_printFinishing | {}) | Array<microsoft_graph_printFinishing | {}>>
    | undefined;
  fitPdfToPage?: (boolean | null) | undefined;
  inputBin?: (string | null) | undefined;
  margin?:
    | ((microsoft_graph_printMargin | {}) | Array<microsoft_graph_printMargin | {}>)
    | undefined;
  mediaSize?: (string | null) | undefined;
  mediaType?: (string | null) | undefined;
  multipageLayout?:
    | (
        | (microsoft_graph_printMultipageLayout | {})
        | Array<microsoft_graph_printMultipageLayout | {}>
      )
    | undefined;
  orientation?:
    | ((microsoft_graph_printOrientation | {}) | Array<microsoft_graph_printOrientation | {}>)
    | undefined;
  outputBin?: (string | null) | undefined;
  pageRanges?: Array<microsoft_graph_integerRange> | undefined;
  pagesPerSheet?: (number | null) | undefined;
  quality?:
    | ((microsoft_graph_printQuality | {}) | Array<microsoft_graph_printQuality | {}>)
    | undefined;
  scaling?:
    | ((microsoft_graph_printScaling | {}) | Array<microsoft_graph_printScaling | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_printMargin = {
  bottom?: (number | null) | undefined;
  left?: (number | null) | undefined;
  right?: (number | null) | undefined;
  top?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_userIdentity = microsoft_graph_identity & {
  ipAddress?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_printJobStatus = {
  description?: string | undefined;
  details?: Array<microsoft_graph_printJobStateDetail> | undefined;
  isAcquiredByPrinter?: boolean | undefined;
  state?: microsoft_graph_printJobProcessingState | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_printDocument = microsoft_graph_entity & {
  contentType?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  downloadedDateTime?: (string | null) | undefined;
  size?: number | undefined;
  uploadedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_printTaskStatus = {
  description?: string | undefined;
  state?: microsoft_graph_printTaskProcessingState | undefined;
  '@odata.type': string;
};
type microsoft_graph_printTaskProcessingState =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'aborted'
  | 'unknownFutureValue';
type microsoft_graph_appIdentity = {
  appId?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  servicePrincipalId?: (string | null) | undefined;
  servicePrincipalName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_printEvent = 'jobStarted' | 'unknownFutureValue';
type microsoft_graph_printerShareViewpoint = {
  lastUsedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_groupLifecyclePolicy = microsoft_graph_entity & {
  alternateNotificationEmails?: (string | null) | undefined;
  groupLifetimeInDays?: (number | null) | undefined;
  managedGroupTypes?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenote = microsoft_graph_entity & {
  notebooks?: Array<microsoft_graph_notebook> | undefined;
  operations?: Array<microsoft_graph_onenoteOperation> | undefined;
  pages?: Array<microsoft_graph_onenotePage> | undefined;
  resources?: Array<microsoft_graph_onenoteResource> | undefined;
  sectionGroups?: Array<microsoft_graph_sectionGroup> | undefined;
  sections?: Array<microsoft_graph_onenoteSection> | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenoteEntityHierarchyModel =
  microsoft_graph_onenoteEntitySchemaObjectModel & {
    createdBy?:
      | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
      | undefined;
    displayName?: (string | null) | undefined;
    lastModifiedBy?:
      | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
      | undefined;
    lastModifiedDateTime?: (string | null) | undefined;
    '@odata.type': string;
  };
type microsoft_graph_onenoteEntitySchemaObjectModel = microsoft_graph_onenoteEntityBaseModel & {
  createdDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenoteEntityBaseModel = microsoft_graph_entity & {
  self?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_notebookLinks = {
  oneNoteClientUrl?:
    | ((microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>)
    | undefined;
  oneNoteWebUrl?:
    | ((microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_externalLink = {
  href?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenoteUserRole = 'None' | 'Owner' | 'Contributor' | 'Reader';
type microsoft_graph_sectionLinks = {
  oneNoteClientUrl?:
    | ((microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>)
    | undefined;
  oneNoteWebUrl?:
    | ((microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_pageLinks = {
  oneNoteClientUrl?:
    | ((microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>)
    | undefined;
  oneNoteWebUrl?:
    | ((microsoft_graph_externalLink | {}) | Array<microsoft_graph_externalLink | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenoteOperation = microsoft_graph_operation & {
  error?:
    | (
        | (microsoft_graph_onenoteOperationError | {})
        | Array<microsoft_graph_onenoteOperationError | {}>
      )
    | undefined;
  percentComplete?: (string | null) | undefined;
  resourceId?: (string | null) | undefined;
  resourceLocation?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_operation = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  lastActionDateTime?: (string | null) | undefined;
  status?:
    | ((microsoft_graph_operationStatus | {}) | Array<microsoft_graph_operationStatus | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_operationStatus = 'NotStarted' | 'Running' | 'Completed' | 'Failed';
type microsoft_graph_onenoteOperationError = {
  code?: (string | null) | undefined;
  message?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenoteResource = microsoft_graph_onenoteEntityBaseModel & {
  content?: (string | null) | undefined;
  contentUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_resourceSpecificPermissionGrant = microsoft_graph_directoryObject & {
  clientAppId?: (string | null) | undefined;
  clientId?: (string | null) | undefined;
  permission?: (string | null) | undefined;
  permissionType?: (string | null) | undefined;
  resourceAppId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_profilePhoto = microsoft_graph_entity & {
  height?: (number | null) | undefined;
  width?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerGroup = microsoft_graph_entity & {
  plans?: Array<microsoft_graph_plannerPlan> | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerPlan = microsoft_graph_entity & {
  container?:
    | (
        | (microsoft_graph_plannerPlanContainer | {})
        | Array<microsoft_graph_plannerPlanContainer | {}>
      )
    | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  owner?: (string | null) | undefined;
  title?: string | undefined;
  buckets?: Array<microsoft_graph_plannerBucket> | undefined;
  details?:
    | ((microsoft_graph_plannerPlanDetails | {}) | Array<microsoft_graph_plannerPlanDetails | {}>)
    | undefined;
  tasks?: Array<microsoft_graph_plannerTask> | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerPlanContainer = {
  containerId?: (string | null) | undefined;
  type?:
    | (
        | (microsoft_graph_plannerContainerType | {})
        | Array<microsoft_graph_plannerContainerType | {}>
      )
    | undefined;
  url?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerContainerType = 'group' | 'unknownFutureValue' | 'roster';
type microsoft_graph_plannerBucket = microsoft_graph_entity & {
  name?: string | undefined;
  orderHint?: (string | null) | undefined;
  planId?: (string | null) | undefined;
  tasks?: Array<microsoft_graph_plannerTask> | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerTask = microsoft_graph_entity & {
  activeChecklistItemCount?: (number | null) | undefined;
  appliedCategories?:
    | (
        | (microsoft_graph_plannerAppliedCategories | {})
        | Array<microsoft_graph_plannerAppliedCategories | {}>
      )
    | undefined;
  assigneePriority?: (string | null) | undefined;
  assignments?:
    | ((microsoft_graph_plannerAssignments | {}) | Array<microsoft_graph_plannerAssignments | {}>)
    | undefined;
  bucketId?: (string | null) | undefined;
  checklistItemCount?: (number | null) | undefined;
  completedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  completedDateTime?: (string | null) | undefined;
  conversationThreadId?: (string | null) | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  dueDateTime?: (string | null) | undefined;
  hasDescription?: (boolean | null) | undefined;
  orderHint?: (string | null) | undefined;
  percentComplete?: (number | null) | undefined;
  planId?: (string | null) | undefined;
  previewType?:
    | ((microsoft_graph_plannerPreviewType | {}) | Array<microsoft_graph_plannerPreviewType | {}>)
    | undefined;
  priority?: (number | null) | undefined;
  referenceCount?: (number | null) | undefined;
  startDateTime?: (string | null) | undefined;
  title?: string | undefined;
  assignedToTaskBoardFormat?:
    | (
        | (microsoft_graph_plannerAssignedToTaskBoardTaskFormat | {})
        | Array<microsoft_graph_plannerAssignedToTaskBoardTaskFormat | {}>
      )
    | undefined;
  bucketTaskBoardFormat?:
    | (
        | (microsoft_graph_plannerBucketTaskBoardTaskFormat | {})
        | Array<microsoft_graph_plannerBucketTaskBoardTaskFormat | {}>
      )
    | undefined;
  details?:
    | ((microsoft_graph_plannerTaskDetails | {}) | Array<microsoft_graph_plannerTaskDetails | {}>)
    | undefined;
  progressTaskBoardFormat?:
    | (
        | (microsoft_graph_plannerProgressTaskBoardTaskFormat | {})
        | Array<microsoft_graph_plannerProgressTaskBoardTaskFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerAppliedCategories = {
  '@odata.type': string;
};
type microsoft_graph_plannerAssignments = {
  '@odata.type': string;
};
type microsoft_graph_plannerPreviewType =
  | 'automatic'
  | 'noPreview'
  | 'checklist'
  | 'description'
  | 'reference';
type microsoft_graph_plannerAssignedToTaskBoardTaskFormat = microsoft_graph_entity & {
  orderHintsByAssignee?:
    | (
        | (microsoft_graph_plannerOrderHintsByAssignee | {})
        | Array<microsoft_graph_plannerOrderHintsByAssignee | {}>
      )
    | undefined;
  unassignedOrderHint?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerOrderHintsByAssignee = {
  '@odata.type': string;
};
type microsoft_graph_plannerBucketTaskBoardTaskFormat = microsoft_graph_entity & {
  orderHint?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerTaskDetails = microsoft_graph_entity & {
  checklist?:
    | (
        | (microsoft_graph_plannerChecklistItems | {})
        | Array<microsoft_graph_plannerChecklistItems | {}>
      )
    | undefined;
  description?: (string | null) | undefined;
  previewType?:
    | ((microsoft_graph_plannerPreviewType | {}) | Array<microsoft_graph_plannerPreviewType | {}>)
    | undefined;
  references?:
    | (
        | (microsoft_graph_plannerExternalReferences | {})
        | Array<microsoft_graph_plannerExternalReferences | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerChecklistItems = {
  '@odata.type': string;
};
type microsoft_graph_plannerExternalReferences = {
  '@odata.type': string;
};
type microsoft_graph_plannerProgressTaskBoardTaskFormat = microsoft_graph_entity & {
  orderHint?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerPlanDetails = microsoft_graph_entity & {
  categoryDescriptions?:
    | (
        | (microsoft_graph_plannerCategoryDescriptions | {})
        | Array<microsoft_graph_plannerCategoryDescriptions | {}>
      )
    | undefined;
  sharedWith?:
    | ((microsoft_graph_plannerUserIds | {}) | Array<microsoft_graph_plannerUserIds | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerCategoryDescriptions = {
  category1?: (string | null) | undefined;
  category10?: (string | null) | undefined;
  category11?: (string | null) | undefined;
  category12?: (string | null) | undefined;
  category13?: (string | null) | undefined;
  category14?: (string | null) | undefined;
  category15?: (string | null) | undefined;
  category16?: (string | null) | undefined;
  category17?: (string | null) | undefined;
  category18?: (string | null) | undefined;
  category19?: (string | null) | undefined;
  category2?: (string | null) | undefined;
  category20?: (string | null) | undefined;
  category21?: (string | null) | undefined;
  category22?: (string | null) | undefined;
  category23?: (string | null) | undefined;
  category24?: (string | null) | undefined;
  category25?: (string | null) | undefined;
  category3?: (string | null) | undefined;
  category4?: (string | null) | undefined;
  category5?: (string | null) | undefined;
  category6?: (string | null) | undefined;
  category7?: (string | null) | undefined;
  category8?: (string | null) | undefined;
  category9?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_plannerUserIds = {
  '@odata.type': string;
};
type microsoft_graph_groupSetting = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  templateId?: (string | null) | undefined;
  values?: Array<microsoft_graph_settingValue> | undefined;
  '@odata.type': string;
};
type microsoft_graph_settingValue = {
  name?: (string | null) | undefined;
  value?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_publicError = {
  code?: (string | null) | undefined;
  details?: Array<microsoft_graph_publicErrorDetail> | undefined;
  innerError?:
    | ((microsoft_graph_publicInnerError | {}) | Array<microsoft_graph_publicInnerError | {}>)
    | undefined;
  message?: (string | null) | undefined;
  target?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_publicErrorDetail = {
  code?: (string | null) | undefined;
  message?: (string | null) | undefined;
  target?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_publicInnerError = {
  code?: (string | null) | undefined;
  details?: Array<microsoft_graph_publicErrorDetail> | undefined;
  message?: (string | null) | undefined;
  target?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_root = {
  '@odata.type': string;
};
type microsoft_graph_siteCollection = {
  archivalDetails?:
    | ((microsoft_graph_siteArchivalDetails | {}) | Array<microsoft_graph_siteArchivalDetails | {}>)
    | undefined;
  dataLocationCode?: (string | null) | undefined;
  hostname?: (string | null) | undefined;
  root?: ((microsoft_graph_root | {}) | Array<microsoft_graph_root | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_siteArchivalDetails = {
  archiveStatus?:
    | ((microsoft_graph_siteArchiveStatus | {}) | Array<microsoft_graph_siteArchiveStatus | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_siteArchiveStatus =
  | 'recentlyArchived'
  | 'fullyArchived'
  | 'reactivating'
  | 'unknownFutureValue';
type microsoft_graph_itemActionStat = {
  actionCount?: (number | null) | undefined;
  actorCount?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_incompleteData = {
  missingDataBeforeDateTime?: (string | null) | undefined;
  wasThrottled?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessAction = {
  '@odata.type': string;
};
type microsoft_graph_audio = {
  album?: (string | null) | undefined;
  albumArtist?: (string | null) | undefined;
  artist?: (string | null) | undefined;
  bitrate?: (number | null) | undefined;
  composers?: (string | null) | undefined;
  copyright?: (string | null) | undefined;
  disc?: (number | null) | undefined;
  discCount?: (number | null) | undefined;
  duration?: (number | null) | undefined;
  genre?: (string | null) | undefined;
  hasDrm?: (boolean | null) | undefined;
  isVariableBitrate?: (boolean | null) | undefined;
  title?: (string | null) | undefined;
  track?: (number | null) | undefined;
  trackCount?: (number | null) | undefined;
  year?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_bundle = {
  album?: ((microsoft_graph_album | {}) | Array<microsoft_graph_album | {}>) | undefined;
  childCount?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_album = {
  coverImageItemId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_deleted = {
  state?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_file = {
  hashes?: ((microsoft_graph_hashes | {}) | Array<microsoft_graph_hashes | {}>) | undefined;
  mimeType?: (string | null) | undefined;
  processingMetadata?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_hashes = {
  crc32Hash?: (string | null) | undefined;
  quickXorHash?: (string | null) | undefined;
  sha1Hash?: (string | null) | undefined;
  sha256Hash?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_fileSystemInfo = {
  createdDateTime?: (string | null) | undefined;
  lastAccessedDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_folder = {
  childCount?: (number | null) | undefined;
  view?: ((microsoft_graph_folderView | {}) | Array<microsoft_graph_folderView | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_folderView = {
  sortBy?: (string | null) | undefined;
  sortOrder?: (string | null) | undefined;
  viewType?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_image = {
  height?: (number | null) | undefined;
  width?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_geoCoordinates = {
  altitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  latitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  longitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  '@odata.type': string;
};
type microsoft_graph_malware = {
  description?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_package = {
  type?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_pendingOperations = {
  pendingContentUpdate?:
    | (
        | (microsoft_graph_pendingContentUpdate | {})
        | Array<microsoft_graph_pendingContentUpdate | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_pendingContentUpdate = {
  queuedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_photo = {
  cameraMake?: (string | null) | undefined;
  cameraModel?: (string | null) | undefined;
  exposureDenominator?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  exposureNumerator?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  fNumber?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  focalLength?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  iso?: (number | null) | undefined;
  orientation?: (number | null) | undefined;
  takenDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_publicationFacet = {
  checkedOutBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  level?: (string | null) | undefined;
  versionId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_remoteItem = {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  file?: ((microsoft_graph_file | {}) | Array<microsoft_graph_file | {}>) | undefined;
  fileSystemInfo?:
    | ((microsoft_graph_fileSystemInfo | {}) | Array<microsoft_graph_fileSystemInfo | {}>)
    | undefined;
  folder?: ((microsoft_graph_folder | {}) | Array<microsoft_graph_folder | {}>) | undefined;
  id?: (string | null) | undefined;
  image?: ((microsoft_graph_image | {}) | Array<microsoft_graph_image | {}>) | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  name?: (string | null) | undefined;
  package?: ((microsoft_graph_package | {}) | Array<microsoft_graph_package | {}>) | undefined;
  parentReference?:
    | ((microsoft_graph_itemReference | {}) | Array<microsoft_graph_itemReference | {}>)
    | undefined;
  shared?: ((microsoft_graph_shared | {}) | Array<microsoft_graph_shared | {}>) | undefined;
  sharepointIds?:
    | ((microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>)
    | undefined;
  size?: (number | null) | undefined;
  specialFolder?:
    | ((microsoft_graph_specialFolder | {}) | Array<microsoft_graph_specialFolder | {}>)
    | undefined;
  video?: ((microsoft_graph_video | {}) | Array<microsoft_graph_video | {}>) | undefined;
  webDavUrl?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_shared = {
  owner?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  scope?: (string | null) | undefined;
  sharedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  sharedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_specialFolder = {
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_video = {
  audioBitsPerSample?: (number | null) | undefined;
  audioChannels?: (number | null) | undefined;
  audioFormat?: (string | null) | undefined;
  audioSamplesPerSecond?: (number | null) | undefined;
  bitrate?: (number | null) | undefined;
  duration?: (number | null) | undefined;
  fourCC?: (string | null) | undefined;
  frameRate?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  height?: (number | null) | undefined;
  width?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_searchResult = {
  onClickTelemetryUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_contentTypeInfo = {
  id?: (string | null) | undefined;
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_documentSetVersion = microsoft_graph_listItemVersion & {
  comment?: (string | null) | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  items?: Array<microsoft_graph_documentSetVersionItem> | undefined;
  shouldCaptureMinorVersion?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_listItemVersion = microsoft_graph_baseItemVersion & {
  fields?:
    | ((microsoft_graph_fieldValueSet | {}) | Array<microsoft_graph_fieldValueSet | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_baseItemVersion = microsoft_graph_entity & {
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  publication?:
    | ((microsoft_graph_publicationFacet | {}) | Array<microsoft_graph_publicationFacet | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_fieldValueSet = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_documentSetVersionItem = {
  itemId?: (string | null) | undefined;
  title?: (string | null) | undefined;
  versionId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_permission = microsoft_graph_entity & {
  expirationDateTime?: (string | null) | undefined;
  grantedTo?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  grantedToIdentities?: Array<microsoft_graph_identitySet> | undefined;
  grantedToIdentitiesV2?: Array<microsoft_graph_sharePointIdentitySet> | undefined;
  grantedToV2?:
    | (
        | (microsoft_graph_sharePointIdentitySet | {})
        | Array<microsoft_graph_sharePointIdentitySet | {}>
      )
    | undefined;
  hasPassword?: (boolean | null) | undefined;
  inheritedFrom?:
    | ((microsoft_graph_itemReference | {}) | Array<microsoft_graph_itemReference | {}>)
    | undefined;
  invitation?:
    | ((microsoft_graph_sharingInvitation | {}) | Array<microsoft_graph_sharingInvitation | {}>)
    | undefined;
  link?: ((microsoft_graph_sharingLink | {}) | Array<microsoft_graph_sharingLink | {}>) | undefined;
  roles?: Array<string | null> | undefined;
  shareId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharePointIdentitySet = microsoft_graph_identitySet & {
  group?: ((microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>) | undefined;
  siteGroup?:
    | ((microsoft_graph_sharePointIdentity | {}) | Array<microsoft_graph_sharePointIdentity | {}>)
    | undefined;
  siteUser?:
    | ((microsoft_graph_sharePointIdentity | {}) | Array<microsoft_graph_sharePointIdentity | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharePointIdentity = microsoft_graph_identity & {
  loginName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharingInvitation = {
  email?: (string | null) | undefined;
  invitedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  redeemedBy?: (string | null) | undefined;
  signInRequired?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharingLink = {
  application?:
    | ((microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>)
    | undefined;
  preventsDownload?: (boolean | null) | undefined;
  scope?: (string | null) | undefined;
  type?: (string | null) | undefined;
  webHtml?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_itemRetentionLabel = microsoft_graph_entity & {
  isLabelAppliedExplicitly?: (boolean | null) | undefined;
  labelAppliedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  labelAppliedDateTime?: (string | null) | undefined;
  name?: (string | null) | undefined;
  retentionSettings?:
    | (
        | (microsoft_graph_retentionLabelSettings | {})
        | Array<microsoft_graph_retentionLabelSettings | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_retentionLabelSettings = {
  behaviorDuringRetentionPeriod?:
    | (
        | (microsoft_graph_security_behaviorDuringRetentionPeriod | {})
        | Array<microsoft_graph_security_behaviorDuringRetentionPeriod | {}>
      )
    | undefined;
  isContentUpdateAllowed?: (boolean | null) | undefined;
  isDeleteAllowed?: (boolean | null) | undefined;
  isLabelUpdateAllowed?: (boolean | null) | undefined;
  isMetadataUpdateAllowed?: (boolean | null) | undefined;
  isRecordLocked?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_behaviorDuringRetentionPeriod =
  | 'doNotRetain'
  | 'retain'
  | 'retainAsRecord'
  | 'retainAsRegulatoryRecord'
  | 'unknownFutureValue';
type microsoft_graph_subscription = microsoft_graph_entity & {
  applicationId?: (string | null) | undefined;
  changeType?: string | undefined;
  clientState?: (string | null) | undefined;
  creatorId?: (string | null) | undefined;
  encryptionCertificate?: (string | null) | undefined;
  encryptionCertificateId?: (string | null) | undefined;
  expirationDateTime?: string | undefined;
  includeResourceData?: (boolean | null) | undefined;
  latestSupportedTlsVersion?: (string | null) | undefined;
  lifecycleNotificationUrl?: (string | null) | undefined;
  notificationQueryOptions?: (string | null) | undefined;
  notificationUrl?: string | undefined;
  notificationUrlAppId?: (string | null) | undefined;
  resource?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_thumbnailSet = microsoft_graph_entity & {
  large?: ((microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>) | undefined;
  medium?: ((microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>) | undefined;
  small?: ((microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>) | undefined;
  source?: ((microsoft_graph_thumbnail | {}) | Array<microsoft_graph_thumbnail | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_thumbnail = {
  content?: (string | null) | undefined;
  height?: (number | null) | undefined;
  sourceItemId?: (string | null) | undefined;
  url?: (string | null) | undefined;
  width?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_driveItemVersion = microsoft_graph_baseItemVersion & {
  content?: (string | null) | undefined;
  size?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbook = microsoft_graph_entity & {
  application?:
    | ((microsoft_graph_workbookApplication | {}) | Array<microsoft_graph_workbookApplication | {}>)
    | undefined;
  comments?: Array<microsoft_graph_workbookComment> | undefined;
  functions?:
    | ((microsoft_graph_workbookFunctions | {}) | Array<microsoft_graph_workbookFunctions | {}>)
    | undefined;
  names?: Array<microsoft_graph_workbookNamedItem> | undefined;
  operations?: Array<microsoft_graph_workbookOperation> | undefined;
  tables?: Array<microsoft_graph_workbookTable> | undefined;
  worksheets?: Array<microsoft_graph_workbookWorksheet> | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookApplication = microsoft_graph_entity & {
  calculationMode?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookComment = microsoft_graph_entity & {
  content?: (string | null) | undefined;
  contentType?: string | undefined;
  replies?: Array<microsoft_graph_workbookCommentReply> | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookCommentReply = microsoft_graph_entity & {
  content?: (string | null) | undefined;
  contentType?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookFunctions = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_workbookChartAxes = microsoft_graph_entity & {
  categoryAxis?:
    | ((microsoft_graph_workbookChartAxis | {}) | Array<microsoft_graph_workbookChartAxis | {}>)
    | undefined;
  seriesAxis?:
    | ((microsoft_graph_workbookChartAxis | {}) | Array<microsoft_graph_workbookChartAxis | {}>)
    | undefined;
  valueAxis?:
    | ((microsoft_graph_workbookChartAxis | {}) | Array<microsoft_graph_workbookChartAxis | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartAxis = microsoft_graph_entity & {
  majorUnit?: unknown | undefined;
  maximum?: unknown | undefined;
  minimum?: unknown | undefined;
  minorUnit?: unknown | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartAxisFormat | {})
        | Array<microsoft_graph_workbookChartAxisFormat | {}>
      )
    | undefined;
  majorGridlines?:
    | (
        | (microsoft_graph_workbookChartGridlines | {})
        | Array<microsoft_graph_workbookChartGridlines | {}>
      )
    | undefined;
  minorGridlines?:
    | (
        | (microsoft_graph_workbookChartGridlines | {})
        | Array<microsoft_graph_workbookChartGridlines | {}>
      )
    | undefined;
  title?:
    | (
        | (microsoft_graph_workbookChartAxisTitle | {})
        | Array<microsoft_graph_workbookChartAxisTitle | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartAxisFormat = microsoft_graph_entity & {
  font?:
    | ((microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>)
    | undefined;
  line?:
    | (
        | (microsoft_graph_workbookChartLineFormat | {})
        | Array<microsoft_graph_workbookChartLineFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartFont = microsoft_graph_entity & {
  bold?: (boolean | null) | undefined;
  color?: (string | null) | undefined;
  italic?: (boolean | null) | undefined;
  name?: (string | null) | undefined;
  size?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  underline?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartLineFormat = microsoft_graph_entity & {
  color?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartGridlines = microsoft_graph_entity & {
  visible?: boolean | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartGridlinesFormat | {})
        | Array<microsoft_graph_workbookChartGridlinesFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartGridlinesFormat = microsoft_graph_entity & {
  line?:
    | (
        | (microsoft_graph_workbookChartLineFormat | {})
        | Array<microsoft_graph_workbookChartLineFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartAxisTitle = microsoft_graph_entity & {
  text?: (string | null) | undefined;
  visible?: boolean | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartAxisTitleFormat | {})
        | Array<microsoft_graph_workbookChartAxisTitleFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartAxisTitleFormat = microsoft_graph_entity & {
  font?:
    | ((microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartDataLabels = microsoft_graph_entity & {
  position?: (string | null) | undefined;
  separator?: (string | null) | undefined;
  showBubbleSize?: (boolean | null) | undefined;
  showCategoryName?: (boolean | null) | undefined;
  showLegendKey?: (boolean | null) | undefined;
  showPercentage?: (boolean | null) | undefined;
  showSeriesName?: (boolean | null) | undefined;
  showValue?: (boolean | null) | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartDataLabelFormat | {})
        | Array<microsoft_graph_workbookChartDataLabelFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartDataLabelFormat = microsoft_graph_entity & {
  fill?:
    | ((microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>)
    | undefined;
  font?:
    | ((microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartFill = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_workbookChartAreaFormat = microsoft_graph_entity & {
  fill?:
    | ((microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>)
    | undefined;
  font?:
    | ((microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartLegend = microsoft_graph_entity & {
  overlay?: (boolean | null) | undefined;
  position?: (string | null) | undefined;
  visible?: boolean | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartLegendFormat | {})
        | Array<microsoft_graph_workbookChartLegendFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartLegendFormat = microsoft_graph_entity & {
  fill?:
    | ((microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>)
    | undefined;
  font?:
    | ((microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartSeries = microsoft_graph_entity & {
  name?: (string | null) | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartSeriesFormat | {})
        | Array<microsoft_graph_workbookChartSeriesFormat | {}>
      )
    | undefined;
  points?: Array<microsoft_graph_workbookChartPoint> | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartSeriesFormat = microsoft_graph_entity & {
  fill?:
    | ((microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>)
    | undefined;
  line?:
    | (
        | (microsoft_graph_workbookChartLineFormat | {})
        | Array<microsoft_graph_workbookChartLineFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartPoint = microsoft_graph_entity & {
  value?: unknown | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartPointFormat | {})
        | Array<microsoft_graph_workbookChartPointFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartPointFormat = microsoft_graph_entity & {
  fill?:
    | ((microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartTitle = microsoft_graph_entity & {
  overlay?: (boolean | null) | undefined;
  text?: (string | null) | undefined;
  visible?: boolean | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartTitleFormat | {})
        | Array<microsoft_graph_workbookChartTitleFormat | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChartTitleFormat = microsoft_graph_entity & {
  fill?:
    | ((microsoft_graph_workbookChartFill | {}) | Array<microsoft_graph_workbookChartFill | {}>)
    | undefined;
  font?:
    | ((microsoft_graph_workbookChartFont | {}) | Array<microsoft_graph_workbookChartFont | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookWorksheetProtection = microsoft_graph_entity & {
  options?:
    | (
        | (microsoft_graph_workbookWorksheetProtectionOptions | {})
        | Array<microsoft_graph_workbookWorksheetProtectionOptions | {}>
      )
    | undefined;
  protected?: boolean | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookWorksheetProtectionOptions = {
  allowAutoFilter?: boolean | undefined;
  allowDeleteColumns?: boolean | undefined;
  allowDeleteRows?: boolean | undefined;
  allowFormatCells?: boolean | undefined;
  allowFormatColumns?: boolean | undefined;
  allowFormatRows?: boolean | undefined;
  allowInsertColumns?: boolean | undefined;
  allowInsertHyperlinks?: boolean | undefined;
  allowInsertRows?: boolean | undefined;
  allowPivotTables?: boolean | undefined;
  allowSort?: boolean | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookTableColumn = microsoft_graph_entity & {
  index?: number | undefined;
  name?: (string | null) | undefined;
  values?: unknown | undefined;
  filter?:
    | ((microsoft_graph_workbookFilter | {}) | Array<microsoft_graph_workbookFilter | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookFilter = microsoft_graph_entity & {
  criteria?:
    | (
        | (microsoft_graph_workbookFilterCriteria | {})
        | Array<microsoft_graph_workbookFilterCriteria | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookFilterCriteria = {
  color?: (string | null) | undefined;
  criterion1?: (string | null) | undefined;
  criterion2?: (string | null) | undefined;
  dynamicCriteria?: string | undefined;
  filterOn?: string | undefined;
  icon?:
    | ((microsoft_graph_workbookIcon | {}) | Array<microsoft_graph_workbookIcon | {}>)
    | undefined;
  operator?: string | undefined;
  values?: unknown | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookIcon = {
  index?: number | undefined;
  set?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookTableRow = microsoft_graph_entity & {
  index?: number | undefined;
  values?: unknown | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookTableSort = microsoft_graph_entity & {
  fields?: Array<microsoft_graph_workbookSortField> | undefined;
  matchCase?: boolean | undefined;
  method?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookSortField = {
  ascending?: boolean | undefined;
  color?: (string | null) | undefined;
  dataOption?: string | undefined;
  icon?:
    | ((microsoft_graph_workbookIcon | {}) | Array<microsoft_graph_workbookIcon | {}>)
    | undefined;
  key?: number | undefined;
  sortOn?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookOperation = microsoft_graph_entity & {
  error?:
    | (
        | (microsoft_graph_workbookOperationError | {})
        | Array<microsoft_graph_workbookOperationError | {}>
      )
    | undefined;
  resourceLocation?: (string | null) | undefined;
  status?: microsoft_graph_workbookOperationStatus | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookOperationStatus = 'notStarted' | 'running' | 'succeeded' | 'failed';
type microsoft_graph_booleanColumn = {
  '@odata.type': string;
};
type microsoft_graph_calculatedColumn = {
  format?: (string | null) | undefined;
  formula?: (string | null) | undefined;
  outputType?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_choiceColumn = {
  allowTextEntry?: (boolean | null) | undefined;
  choices?: Array<string | null> | undefined;
  displayAs?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_contentApprovalStatusColumn = {
  '@odata.type': string;
};
type microsoft_graph_currencyColumn = {
  locale?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_dateTimeColumn = {
  displayAs?: (string | null) | undefined;
  format?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_defaultColumnValue = {
  formula?: (string | null) | undefined;
  value?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_geolocationColumn = {
  '@odata.type': string;
};
type microsoft_graph_hyperlinkOrPictureColumn = {
  isPicture?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_lookupColumn = {
  allowMultipleValues?: (boolean | null) | undefined;
  allowUnlimitedLength?: (boolean | null) | undefined;
  columnName?: (string | null) | undefined;
  listId?: (string | null) | undefined;
  primaryLookupColumnId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_numberColumn = {
  decimalPlaces?: (string | null) | undefined;
  displayAs?: (string | null) | undefined;
  maximum?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  minimum?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  '@odata.type': string;
};
type microsoft_graph_personOrGroupColumn = {
  allowMultipleSelection?: (boolean | null) | undefined;
  chooseFromType?: (string | null) | undefined;
  displayAs?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_termColumn = {
  allowMultipleValues?: (boolean | null) | undefined;
  showFullyQualifiedName?: (boolean | null) | undefined;
  parentTerm?:
    | ((microsoft_graph_termStore_term | {}) | Array<microsoft_graph_termStore_term | {}>)
    | undefined;
  termSet?:
    | ((microsoft_graph_termStore_set | {}) | Array<microsoft_graph_termStore_set | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_localizedDescription = {
  description?: (string | null) | undefined;
  languageTag?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_localizedLabel = {
  isDefault?: (boolean | null) | undefined;
  languageTag?: (string | null) | undefined;
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_keyValue = {
  key?: (string | null) | undefined;
  value?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_relationType = 'pin' | 'reuse' | 'unknownFutureValue';
type microsoft_graph_termStore_localizedName = {
  languageTag?: (string | null) | undefined;
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_termGroupScope =
  | 'global'
  | 'system'
  | 'siteCollection'
  | 'unknownFutureValue';
type microsoft_graph_textColumn = {
  allowMultipleLines?: (boolean | null) | undefined;
  appendChangesToExistingText?: (boolean | null) | undefined;
  linesForEditing?: (number | null) | undefined;
  maxLength?: (number | null) | undefined;
  textType?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_thumbnailColumn = {
  '@odata.type': string;
};
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
type microsoft_graph_columnValidation = {
  defaultLanguage?: (string | null) | undefined;
  descriptions?: Array<microsoft_graph_displayNameLocalization> | undefined;
  formula?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_displayNameLocalization = {
  displayName?: (string | null) | undefined;
  languageTag?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_documentSet = {
  allowedContentTypes?: Array<microsoft_graph_contentTypeInfo> | undefined;
  defaultContents?: Array<microsoft_graph_documentSetContent> | undefined;
  propagateWelcomePageChanges?: (boolean | null) | undefined;
  shouldPrefixNameToFile?: (boolean | null) | undefined;
  welcomePageUrl?: (string | null) | undefined;
  sharedColumns?: Array<microsoft_graph_columnDefinition> | undefined;
  welcomePageColumns?: Array<microsoft_graph_columnDefinition> | undefined;
  '@odata.type': string;
};
type microsoft_graph_documentSetContent = {
  contentType?:
    | ((microsoft_graph_contentTypeInfo | {}) | Array<microsoft_graph_contentTypeInfo | {}>)
    | undefined;
  fileName?: (string | null) | undefined;
  folderName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_contentTypeOrder = {
  default?: (boolean | null) | undefined;
  position?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_columnLink = microsoft_graph_entity & {
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_listInfo = {
  contentTypesEnabled?: (boolean | null) | undefined;
  hidden?: (boolean | null) | undefined;
  template?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_systemFacet = {
  '@odata.type': string;
};
type microsoft_graph_richLongRunningOperation = microsoft_graph_longRunningOperation & {
  error?:
    | ((microsoft_graph_publicError | {}) | Array<microsoft_graph_publicError | {}>)
    | undefined;
  percentageComplete?: (number | null) | undefined;
  resourceId?: (string | null) | undefined;
  type?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_longRunningOperation = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  lastActionDateTime?: (string | null) | undefined;
  resourceLocation?: (string | null) | undefined;
  status?:
    | (
        | (microsoft_graph_longRunningOperationStatus | {})
        | Array<microsoft_graph_longRunningOperationStatus | {}>
      )
    | undefined;
  statusDetail?: (string | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_termStore_store = microsoft_graph_entity & {
  defaultLanguageTag?: string | undefined;
  languageTags?: Array<string> | undefined;
  groups?: Array<microsoft_graph_termStore_group> | undefined;
  sets?: Array<microsoft_graph_termStore_set> | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamFunSettings = {
  allowCustomMemes?: (boolean | null) | undefined;
  allowGiphy?: (boolean | null) | undefined;
  allowStickersAndMemes?: (boolean | null) | undefined;
  giphyContentRating?:
    | ((microsoft_graph_giphyRatingType | {}) | Array<microsoft_graph_giphyRatingType | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_giphyRatingType = 'strict' | 'moderate' | 'unknownFutureValue';
type microsoft_graph_teamGuestSettings = {
  allowCreateUpdateChannels?: (boolean | null) | undefined;
  allowDeleteChannels?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamMemberSettings = {
  allowAddRemoveApps?: (boolean | null) | undefined;
  allowCreatePrivateChannels?: (boolean | null) | undefined;
  allowCreateUpdateChannels?: (boolean | null) | undefined;
  allowCreateUpdateRemoveConnectors?: (boolean | null) | undefined;
  allowCreateUpdateRemoveTabs?: (boolean | null) | undefined;
  allowDeleteChannels?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamMessagingSettings = {
  allowChannelMentions?: (boolean | null) | undefined;
  allowOwnerDeleteMessages?: (boolean | null) | undefined;
  allowTeamMentions?: (boolean | null) | undefined;
  allowUserDeleteMessages?: (boolean | null) | undefined;
  allowUserEditMessages?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamSpecialization =
  | 'none'
  | 'educationStandard'
  | 'educationClass'
  | 'educationProfessionalLearningCommunity'
  | 'educationStaff'
  | 'healthcareStandard'
  | 'healthcareCareCoordination'
  | 'unknownFutureValue';
type microsoft_graph_teamSummary = {
  guestsCount?: (number | null) | undefined;
  membersCount?: (number | null) | undefined;
  ownersCount?: (number | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_channelSummary = {
  guestsCount?: (number | null) | undefined;
  hasMembersFromOtherTenants?: (boolean | null) | undefined;
  membersCount?: (number | null) | undefined;
  ownersCount?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_conversationMember = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  roles?: Array<string | null> | undefined;
  visibleHistoryStartDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessageAttachment = {
  content?: (string | null) | undefined;
  contentType?: (string | null) | undefined;
  contentUrl?: (string | null) | undefined;
  id?: (string | null) | undefined;
  name?: (string | null) | undefined;
  teamsAppId?: (string | null) | undefined;
  thumbnailUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_channelIdentity = {
  channelId?: (string | null) | undefined;
  teamId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_eventMessageDetail = {
  '@odata.type': string;
};
type microsoft_graph_chatMessageFromIdentitySet = microsoft_graph_identitySet & {
  '@odata.type': string;
};
type microsoft_graph_chatMessageImportance = 'normal' | 'high' | 'urgent' | 'unknownFutureValue';
type microsoft_graph_chatMessageMention = {
  id?: (number | null) | undefined;
  mentioned?:
    | (
        | (microsoft_graph_chatMessageMentionedIdentitySet | {})
        | Array<microsoft_graph_chatMessageMentionedIdentitySet | {}>
      )
    | undefined;
  mentionText?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessageMentionedIdentitySet = microsoft_graph_identitySet & {
  conversation?:
    | (
        | (microsoft_graph_teamworkConversationIdentity | {})
        | Array<microsoft_graph_teamworkConversationIdentity | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamworkConversationIdentity = microsoft_graph_identity & {
  conversationIdentityType?:
    | (
        | (microsoft_graph_teamworkConversationIdentityType | {})
        | Array<microsoft_graph_teamworkConversationIdentityType | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamworkConversationIdentityType =
  | 'team'
  | 'channel'
  | 'chat'
  | 'unknownFutureValue';
type microsoft_graph_chatMessageHistoryItem = {
  actions?: microsoft_graph_chatMessageActions | undefined;
  modifiedDateTime?: string | undefined;
  reaction?:
    | ((microsoft_graph_chatMessageReaction | {}) | Array<microsoft_graph_chatMessageReaction | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessageActions =
  | 'reactionAdded'
  | 'reactionRemoved'
  | 'actionUndefined'
  | 'unknownFutureValue';
type microsoft_graph_chatMessageReaction = {
  createdDateTime?: string | undefined;
  displayName?: (string | null) | undefined;
  reactionContentUrl?: (string | null) | undefined;
  reactionType?: string | undefined;
  user?: microsoft_graph_chatMessageReactionIdentitySet | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessageReactionIdentitySet = microsoft_graph_identitySet & {
  '@odata.type': string;
};
type microsoft_graph_chatMessageType =
  | 'message'
  | 'chatEvent'
  | 'typing'
  | 'unknownFutureValue'
  | 'systemEventMessage';
type microsoft_graph_chatMessagePolicyViolation = {
  dlpAction?:
    | (
        | (microsoft_graph_chatMessagePolicyViolationDlpActionTypes | {})
        | Array<microsoft_graph_chatMessagePolicyViolationDlpActionTypes | {}>
      )
    | undefined;
  justificationText?: (string | null) | undefined;
  policyTip?:
    | (
        | (microsoft_graph_chatMessagePolicyViolationPolicyTip | {})
        | Array<microsoft_graph_chatMessagePolicyViolationPolicyTip | {}>
      )
    | undefined;
  userAction?:
    | (
        | (microsoft_graph_chatMessagePolicyViolationUserActionTypes | {})
        | Array<microsoft_graph_chatMessagePolicyViolationUserActionTypes | {}>
      )
    | undefined;
  verdictDetails?:
    | (
        | (microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes | {})
        | Array<microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessagePolicyViolationDlpActionTypes =
  | 'none'
  | 'notifySender'
  | 'blockAccess'
  | 'blockAccessExternal';
type microsoft_graph_chatMessagePolicyViolationPolicyTip = {
  complianceUrl?: (string | null) | undefined;
  generalText?: (string | null) | undefined;
  matchedConditionDescriptions?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessagePolicyViolationUserActionTypes =
  | 'none'
  | 'override'
  | 'reportFalsePositive';
type microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes =
  | 'none'
  | 'allowFalsePositiveOverride'
  | 'allowOverrideWithoutJustification'
  | 'allowOverrideWithJustification';
type microsoft_graph_chatMessageHostedContent = microsoft_graph_teamworkHostedContent & {
  '@odata.type': string;
};
type microsoft_graph_teamworkHostedContent = microsoft_graph_entity & {
  contentBytes?: (string | null) | undefined;
  contentType?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsTab = microsoft_graph_entity & {
  configuration?:
    | (
        | (microsoft_graph_teamsTabConfiguration | {})
        | Array<microsoft_graph_teamsTabConfiguration | {}>
      )
    | undefined;
  displayName?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  teamsApp?: ((microsoft_graph_teamsApp | {}) | Array<microsoft_graph_teamsApp | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsTabConfiguration = {
  contentUrl?: (string | null) | undefined;
  entityId?: (string | null) | undefined;
  removeUrl?: (string | null) | undefined;
  websiteUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsApp = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  distributionMethod?:
    | (
        | (microsoft_graph_teamsAppDistributionMethod | {})
        | Array<microsoft_graph_teamsAppDistributionMethod | {}>
      )
    | undefined;
  externalId?: (string | null) | undefined;
  appDefinitions?: Array<microsoft_graph_teamsAppDefinition> | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsAppDistributionMethod =
  | 'store'
  | 'organization'
  | 'sideloaded'
  | 'unknownFutureValue';
type microsoft_graph_teamsAppDefinition = microsoft_graph_entity & {
  authorization?:
    | (
        | (microsoft_graph_teamsAppAuthorization | {})
        | Array<microsoft_graph_teamsAppAuthorization | {}>
      )
    | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  publishingState?:
    | (
        | (microsoft_graph_teamsAppPublishingState | {})
        | Array<microsoft_graph_teamsAppPublishingState | {}>
      )
    | undefined;
  shortDescription?: (string | null) | undefined;
  teamsAppId?: (string | null) | undefined;
  version?: (string | null) | undefined;
  bot?: ((microsoft_graph_teamworkBot | {}) | Array<microsoft_graph_teamworkBot | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsAppAuthorization = {
  clientAppId?: (string | null) | undefined;
  requiredPermissionSet?:
    | (
        | (microsoft_graph_teamsAppPermissionSet | {})
        | Array<microsoft_graph_teamsAppPermissionSet | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsAppPermissionSet = {
  resourceSpecificPermissions?:
    | Array<microsoft_graph_teamsAppResourceSpecificPermission>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsAppResourceSpecificPermission = {
  permissionType?:
    | (
        | (microsoft_graph_teamsAppResourceSpecificPermissionType | {})
        | Array<microsoft_graph_teamsAppResourceSpecificPermissionType | {}>
      )
    | undefined;
  permissionValue?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsAppResourceSpecificPermissionType =
  | 'delegated'
  | 'application'
  | 'unknownFutureValue';
type microsoft_graph_teamsAppPublishingState =
  | 'submitted'
  | 'rejected'
  | 'published'
  | 'unknownFutureValue';
type microsoft_graph_teamworkBot = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_teamsAppInstallation = microsoft_graph_entity & {
  consentedPermissionSet?:
    | (
        | (microsoft_graph_teamsAppPermissionSet | {})
        | Array<microsoft_graph_teamsAppPermissionSet | {}>
      )
    | undefined;
  teamsApp?: ((microsoft_graph_teamsApp | {}) | Array<microsoft_graph_teamsApp | {}>) | undefined;
  teamsAppDefinition?:
    | ((microsoft_graph_teamsAppDefinition | {}) | Array<microsoft_graph_teamsAppDefinition | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsAsyncOperation = microsoft_graph_entity & {
  attemptsCount?: number | undefined;
  createdDateTime?: string | undefined;
  error?:
    | ((microsoft_graph_operationError | {}) | Array<microsoft_graph_operationError | {}>)
    | undefined;
  lastActionDateTime?: string | undefined;
  operationType?: microsoft_graph_teamsAsyncOperationType | undefined;
  status?: microsoft_graph_teamsAsyncOperationStatus | undefined;
  targetResourceId?: (string | null) | undefined;
  targetResourceLocation?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_operationError = {
  code?: (string | null) | undefined;
  message?: (string | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_schedule = microsoft_graph_entity & {
  enabled?: (boolean | null) | undefined;
  isActivitiesIncludedWhenCopyingShiftsEnabled?: (boolean | null) | undefined;
  offerShiftRequestsEnabled?: (boolean | null) | undefined;
  openShiftsEnabled?: (boolean | null) | undefined;
  provisionStatus?:
    | ((microsoft_graph_operationStatus | {}) | Array<microsoft_graph_operationStatus | {}>)
    | undefined;
  provisionStatusCode?: (string | null) | undefined;
  startDayOfWeek?:
    | ((microsoft_graph_dayOfWeek | {}) | Array<microsoft_graph_dayOfWeek | {}>)
    | undefined;
  swapShiftsRequestsEnabled?: (boolean | null) | undefined;
  timeClockEnabled?: (boolean | null) | undefined;
  timeClockSettings?:
    | ((microsoft_graph_timeClockSettings | {}) | Array<microsoft_graph_timeClockSettings | {}>)
    | undefined;
  timeOffRequestsEnabled?: (boolean | null) | undefined;
  timeZone?: (string | null) | undefined;
  workforceIntegrationIds?: Array<string | null> | undefined;
  dayNotes?: Array<microsoft_graph_dayNote> | undefined;
  offerShiftRequests?: Array<microsoft_graph_offerShiftRequest> | undefined;
  openShiftChangeRequests?: Array<microsoft_graph_openShiftChangeRequest> | undefined;
  openShifts?: Array<microsoft_graph_openShift> | undefined;
  schedulingGroups?: Array<microsoft_graph_schedulingGroup> | undefined;
  shifts?: Array<microsoft_graph_shift> | undefined;
  swapShiftsChangeRequests?: Array<microsoft_graph_swapShiftsChangeRequest> | undefined;
  timeCards?: Array<microsoft_graph_timeCard> | undefined;
  timeOffReasons?: Array<microsoft_graph_timeOffReason> | undefined;
  timeOffRequests?: Array<microsoft_graph_timeOffRequest> | undefined;
  timesOff?: Array<microsoft_graph_timeOff> | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeClockSettings = {
  approvedLocation?:
    | ((microsoft_graph_geoCoordinates | {}) | Array<microsoft_graph_geoCoordinates | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_dayNote = microsoft_graph_changeTrackedEntity & {
  dayNoteDate?: (string | null) | undefined;
  draftDayNote?:
    | ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>)
    | undefined;
  sharedDayNote?:
    | ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_changeTrackedEntity = microsoft_graph_entity & {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_offerShiftRequest = microsoft_graph_scheduleChangeRequest & {
  recipientActionDateTime?: (string | null) | undefined;
  recipientActionMessage?: (string | null) | undefined;
  recipientUserId?: (string | null) | undefined;
  senderShiftId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_scheduleChangeRequest = microsoft_graph_changeTrackedEntity & {
  assignedTo?:
    | (
        | (microsoft_graph_scheduleChangeRequestActor | {})
        | Array<microsoft_graph_scheduleChangeRequestActor | {}>
      )
    | undefined;
  managerActionDateTime?: (string | null) | undefined;
  managerActionMessage?: (string | null) | undefined;
  managerUserId?: (string | null) | undefined;
  senderDateTime?: (string | null) | undefined;
  senderMessage?: (string | null) | undefined;
  senderUserId?: (string | null) | undefined;
  state?:
    | ((microsoft_graph_scheduleChangeState | {}) | Array<microsoft_graph_scheduleChangeState | {}>)
    | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_openShiftChangeRequest = microsoft_graph_scheduleChangeRequest & {
  openShiftId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_openShift = microsoft_graph_changeTrackedEntity & {
  draftOpenShift?:
    | ((microsoft_graph_openShiftItem | {}) | Array<microsoft_graph_openShiftItem | {}>)
    | undefined;
  isStagedForDeletion?: (boolean | null) | undefined;
  schedulingGroupId?: (string | null) | undefined;
  sharedOpenShift?:
    | ((microsoft_graph_openShiftItem | {}) | Array<microsoft_graph_openShiftItem | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_openShiftItem = microsoft_graph_shiftItem & {
  openSlotCount?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_shiftItem = microsoft_graph_scheduleEntity & {
  activities?: Array<microsoft_graph_shiftActivity> | undefined;
  displayName?: (string | null) | undefined;
  notes?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_scheduleEntity = {
  endDateTime?: (string | null) | undefined;
  startDateTime?: (string | null) | undefined;
  theme?: microsoft_graph_scheduleEntityTheme | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_shiftActivity = {
  code?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  endDateTime?: (string | null) | undefined;
  isPaid?: (boolean | null) | undefined;
  startDateTime?: (string | null) | undefined;
  theme?: microsoft_graph_scheduleEntityTheme | undefined;
  '@odata.type': string;
};
type microsoft_graph_schedulingGroup = microsoft_graph_changeTrackedEntity & {
  code?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isActive?: (boolean | null) | undefined;
  userIds?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_shift = microsoft_graph_changeTrackedEntity & {
  draftShift?:
    | ((microsoft_graph_shiftItem | {}) | Array<microsoft_graph_shiftItem | {}>)
    | undefined;
  isStagedForDeletion?: (boolean | null) | undefined;
  schedulingGroupId?: (string | null) | undefined;
  sharedShift?:
    | ((microsoft_graph_shiftItem | {}) | Array<microsoft_graph_shiftItem | {}>)
    | undefined;
  userId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_swapShiftsChangeRequest = microsoft_graph_offerShiftRequest & {
  recipientShiftId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeCard = microsoft_graph_changeTrackedEntity & {
  breaks?: Array<microsoft_graph_timeCardBreak> | undefined;
  clockInEvent?:
    | ((microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>)
    | undefined;
  clockOutEvent?:
    | ((microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>)
    | undefined;
  confirmedBy?:
    | ((microsoft_graph_confirmedBy | {}) | Array<microsoft_graph_confirmedBy | {}>)
    | undefined;
  notes?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  originalEntry?:
    | ((microsoft_graph_timeCardEntry | {}) | Array<microsoft_graph_timeCardEntry | {}>)
    | undefined;
  state?:
    | ((microsoft_graph_timeCardState | {}) | Array<microsoft_graph_timeCardState | {}>)
    | undefined;
  userId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeCardBreak = {
  breakId?: (string | null) | undefined;
  end?:
    | ((microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>)
    | undefined;
  notes?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  start?: microsoft_graph_timeCardEvent | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeCardEvent = {
  dateTime?: string | undefined;
  isAtApprovedLocation?: (boolean | null) | undefined;
  notes?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_confirmedBy = 'none' | 'user' | 'manager' | 'unknownFutureValue';
type microsoft_graph_timeCardEntry = {
  breaks?: Array<microsoft_graph_timeCardBreak> | undefined;
  clockInEvent?:
    | ((microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>)
    | undefined;
  clockOutEvent?:
    | ((microsoft_graph_timeCardEvent | {}) | Array<microsoft_graph_timeCardEvent | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeCardState = 'clockedIn' | 'onBreak' | 'clockedOut' | 'unknownFutureValue';
type microsoft_graph_timeOffReason = microsoft_graph_changeTrackedEntity & {
  code?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  iconType?:
    | (
        | (microsoft_graph_timeOffReasonIconType | {})
        | Array<microsoft_graph_timeOffReasonIconType | {}>
      )
    | undefined;
  isActive?: (boolean | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_timeOffRequest = microsoft_graph_scheduleChangeRequest & {
  endDateTime?: (string | null) | undefined;
  startDateTime?: (string | null) | undefined;
  timeOffReasonId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeOff = microsoft_graph_changeTrackedEntity & {
  draftTimeOff?:
    | ((microsoft_graph_timeOffItem | {}) | Array<microsoft_graph_timeOffItem | {}>)
    | undefined;
  isStagedForDeletion?: (boolean | null) | undefined;
  sharedTimeOff?:
    | ((microsoft_graph_timeOffItem | {}) | Array<microsoft_graph_timeOffItem | {}>)
    | undefined;
  userId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeOffItem = microsoft_graph_scheduleEntity & {
  timeOffReasonId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamworkTag = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  memberCount?: (number | null) | undefined;
  tagType?:
    | ((microsoft_graph_teamworkTagType | {}) | Array<microsoft_graph_teamworkTagType | {}>)
    | undefined;
  teamId?: (string | null) | undefined;
  members?: Array<microsoft_graph_teamworkTagMember> | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamworkTagType = 'standard' | 'unknownFutureValue';
type microsoft_graph_teamworkTagMember = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  tenantId?: (string | null) | undefined;
  userId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamsTemplate = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_printConnector = microsoft_graph_entity & {
  appVersion?: string | undefined;
  displayName?: string | undefined;
  fullyQualifiedDomainName?: string | undefined;
  location?:
    | ((microsoft_graph_printerLocation | {}) | Array<microsoft_graph_printerLocation | {}>)
    | undefined;
  operatingSystem?: string | undefined;
  registeredDateTime?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_provisionedPlan = {
  capabilityStatus?: (string | null) | undefined;
  provisioningStatus?: (string | null) | undefined;
  service?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_signInActivity = {
  lastNonInteractiveSignInDateTime?: (string | null) | undefined;
  lastNonInteractiveSignInRequestId?: (string | null) | undefined;
  lastSignInDateTime?: (string | null) | undefined;
  lastSignInRequestId?: (string | null) | undefined;
  lastSuccessfulSignInDateTime?: (string | null) | undefined;
  lastSuccessfulSignInRequestId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_status = 'active' | 'updated' | 'deleted' | 'ignored' | 'unknownFutureValue';
type microsoft_graph_visualInfo = {
  attribution?:
    | ((microsoft_graph_imageInfo | {}) | Array<microsoft_graph_imageInfo | {}>)
    | undefined;
  backgroundColor?: (string | null) | undefined;
  content?: unknown | undefined;
  description?: (string | null) | undefined;
  displayText?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_imageInfo = {
  addImageQuery?: (boolean | null) | undefined;
  alternateText?: (string | null) | undefined;
  alternativeText?: (string | null) | undefined;
  iconUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_agreementAcceptance = microsoft_graph_entity & {
  agreementFileId?: (string | null) | undefined;
  agreementId?: (string | null) | undefined;
  deviceDisplayName?: (string | null) | undefined;
  deviceId?: (string | null) | undefined;
  deviceOSType?: (string | null) | undefined;
  deviceOSVersion?: (string | null) | undefined;
  expirationDateTime?: (string | null) | undefined;
  recordedDateTime?: (string | null) | undefined;
  state?:
    | (
        | (microsoft_graph_agreementAcceptanceState | {})
        | Array<microsoft_graph_agreementAcceptanceState | {}>
      )
    | undefined;
  userDisplayName?: (string | null) | undefined;
  userEmail?: (string | null) | undefined;
  userId?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_agreementAcceptanceState = 'accepted' | 'declined' | 'unknownFutureValue';
type microsoft_graph_authentication = microsoft_graph_entity & {
  emailMethods?: Array<microsoft_graph_emailAuthenticationMethod> | undefined;
  fido2Methods?: Array<microsoft_graph_fido2AuthenticationMethod> | undefined;
  methods?: Array<microsoft_graph_authenticationMethod> | undefined;
  microsoftAuthenticatorMethods?:
    | Array<microsoft_graph_microsoftAuthenticatorAuthenticationMethod>
    | undefined;
  operations?: Array<microsoft_graph_longRunningOperation> | undefined;
  passwordMethods?: Array<microsoft_graph_passwordAuthenticationMethod> | undefined;
  phoneMethods?: Array<microsoft_graph_phoneAuthenticationMethod> | undefined;
  platformCredentialMethods?:
    | Array<microsoft_graph_platformCredentialAuthenticationMethod>
    | undefined;
  softwareOathMethods?: Array<microsoft_graph_softwareOathAuthenticationMethod> | undefined;
  temporaryAccessPassMethods?:
    | Array<microsoft_graph_temporaryAccessPassAuthenticationMethod>
    | undefined;
  windowsHelloForBusinessMethods?:
    | Array<microsoft_graph_windowsHelloForBusinessAuthenticationMethod>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_emailAuthenticationMethod = microsoft_graph_authenticationMethod & {
  emailAddress?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_authenticationMethod = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_fido2AuthenticationMethod = microsoft_graph_authenticationMethod & {
  aaGuid?: (string | null) | undefined;
  attestationCertificates?: Array<string | null> | undefined;
  attestationLevel?:
    | ((microsoft_graph_attestationLevel | {}) | Array<microsoft_graph_attestationLevel | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  model?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_attestationLevel = 'attested' | 'notAttested' | 'unknownFutureValue';
type microsoft_graph_microsoftAuthenticatorAuthenticationMethod =
  microsoft_graph_authenticationMethod & {
    createdDateTime?: (string | null) | undefined;
    deviceTag?: (string | null) | undefined;
    displayName?: (string | null) | undefined;
    phoneAppVersion?: (string | null) | undefined;
    device?: ((microsoft_graph_device | {}) | Array<microsoft_graph_device | {}>) | undefined;
    '@odata.type': string;
  };
type microsoft_graph_device = microsoft_graph_directoryObject & {
  accountEnabled?: (boolean | null) | undefined;
  alternativeSecurityIds?: Array<microsoft_graph_alternativeSecurityId> | undefined;
  approximateLastSignInDateTime?: (string | null) | undefined;
  complianceExpirationDateTime?: (string | null) | undefined;
  deviceCategory?: (string | null) | undefined;
  deviceId?: (string | null) | undefined;
  deviceMetadata?: (string | null) | undefined;
  deviceOwnership?: (string | null) | undefined;
  deviceVersion?: (number | null) | undefined;
  displayName?: (string | null) | undefined;
  enrollmentProfileName?: (string | null) | undefined;
  enrollmentType?: (string | null) | undefined;
  isCompliant?: (boolean | null) | undefined;
  isManaged?: (boolean | null) | undefined;
  isManagementRestricted?: (boolean | null) | undefined;
  isRooted?: (boolean | null) | undefined;
  managementType?: (string | null) | undefined;
  manufacturer?: (string | null) | undefined;
  mdmAppId?: (string | null) | undefined;
  model?: (string | null) | undefined;
  onPremisesLastSyncDateTime?: (string | null) | undefined;
  onPremisesSecurityIdentifier?: (string | null) | undefined;
  onPremisesSyncEnabled?: (boolean | null) | undefined;
  operatingSystem?: (string | null) | undefined;
  operatingSystemVersion?: (string | null) | undefined;
  physicalIds?: Array<string> | undefined;
  profileType?: (string | null) | undefined;
  registrationDateTime?: (string | null) | undefined;
  systemLabels?: Array<string> | undefined;
  trustType?: (string | null) | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  memberOf?: Array<microsoft_graph_directoryObject> | undefined;
  registeredOwners?: Array<microsoft_graph_directoryObject> | undefined;
  registeredUsers?: Array<microsoft_graph_directoryObject> | undefined;
  transitiveMemberOf?: Array<microsoft_graph_directoryObject> | undefined;
  '@odata.type': string;
};
type microsoft_graph_alternativeSecurityId = {
  identityProvider?: (string | null) | undefined;
  key?: (string | null) | undefined;
  type?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_passwordAuthenticationMethod = microsoft_graph_authenticationMethod & {
  createdDateTime?: (string | null) | undefined;
  password?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_phoneAuthenticationMethod = microsoft_graph_authenticationMethod & {
  phoneNumber?: (string | null) | undefined;
  phoneType?:
    | (
        | (microsoft_graph_authenticationPhoneType | {})
        | Array<microsoft_graph_authenticationPhoneType | {}>
      )
    | undefined;
  smsSignInState?:
    | (
        | (microsoft_graph_authenticationMethodSignInState | {})
        | Array<microsoft_graph_authenticationMethodSignInState | {}>
      )
    | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_platformCredentialAuthenticationMethod =
  microsoft_graph_authenticationMethod & {
    createdDateTime?: (string | null) | undefined;
    displayName?: (string | null) | undefined;
    keyStrength?:
      | (
          | (microsoft_graph_authenticationMethodKeyStrength | {})
          | Array<microsoft_graph_authenticationMethodKeyStrength | {}>
        )
      | undefined;
    platform?:
      | (
          | (microsoft_graph_authenticationMethodPlatform | {})
          | Array<microsoft_graph_authenticationMethodPlatform | {}>
        )
      | undefined;
    device?: ((microsoft_graph_device | {}) | Array<microsoft_graph_device | {}>) | undefined;
    '@odata.type': string;
  };
type microsoft_graph_authenticationMethodKeyStrength = 'normal' | 'weak' | 'unknown';
type microsoft_graph_authenticationMethodPlatform =
  | 'unknown'
  | 'windows'
  | 'macOS'
  | 'iOS'
  | 'android'
  | 'linux'
  | 'unknownFutureValue';
type microsoft_graph_softwareOathAuthenticationMethod = microsoft_graph_authenticationMethod & {
  secretKey?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_temporaryAccessPassAuthenticationMethod =
  microsoft_graph_authenticationMethod & {
    createdDateTime?: (string | null) | undefined;
    isUsable?: (boolean | null) | undefined;
    isUsableOnce?: (boolean | null) | undefined;
    lifetimeInMinutes?: (number | null) | undefined;
    methodUsabilityReason?: (string | null) | undefined;
    startDateTime?: (string | null) | undefined;
    temporaryAccessPass?: (string | null) | undefined;
    '@odata.type': string;
  };
type microsoft_graph_windowsHelloForBusinessAuthenticationMethod =
  microsoft_graph_authenticationMethod & {
    createdDateTime?: (string | null) | undefined;
    displayName?: (string | null) | undefined;
    keyStrength?:
      | (
          | (microsoft_graph_authenticationMethodKeyStrength | {})
          | Array<microsoft_graph_authenticationMethodKeyStrength | {}>
        )
      | undefined;
    device?: ((microsoft_graph_device | {}) | Array<microsoft_graph_device | {}>) | undefined;
    '@odata.type': string;
  };
type microsoft_graph_calendarGroup = microsoft_graph_entity & {
  changeKey?: (string | null) | undefined;
  classId?: (string | null) | undefined;
  name?: (string | null) | undefined;
  calendars?: Array<microsoft_graph_calendar> | undefined;
  '@odata.type': string;
};
type microsoft_graph_chat = microsoft_graph_entity & {
  chatType?: microsoft_graph_chatType | undefined;
  createdDateTime?: (string | null) | undefined;
  isHiddenForAllMembers?: (boolean | null) | undefined;
  lastUpdatedDateTime?: (string | null) | undefined;
  onlineMeetingInfo?:
    | (
        | (microsoft_graph_teamworkOnlineMeetingInfo | {})
        | Array<microsoft_graph_teamworkOnlineMeetingInfo | {}>
      )
    | undefined;
  tenantId?: (string | null) | undefined;
  topic?: (string | null) | undefined;
  viewpoint?:
    | ((microsoft_graph_chatViewpoint | {}) | Array<microsoft_graph_chatViewpoint | {}>)
    | undefined;
  webUrl?: (string | null) | undefined;
  installedApps?: Array<microsoft_graph_teamsAppInstallation> | undefined;
  lastMessagePreview?:
    | ((microsoft_graph_chatMessageInfo | {}) | Array<microsoft_graph_chatMessageInfo | {}>)
    | undefined;
  members?: Array<microsoft_graph_conversationMember> | undefined;
  messages?: Array<microsoft_graph_chatMessage> | undefined;
  permissionGrants?: Array<microsoft_graph_resourceSpecificPermissionGrant> | undefined;
  pinnedMessages?: Array<microsoft_graph_pinnedChatMessageInfo> | undefined;
  tabs?: Array<microsoft_graph_teamsTab> | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatType = 'oneOnOne' | 'group' | 'meeting' | 'unknownFutureValue';
type microsoft_graph_teamworkOnlineMeetingInfo = {
  calendarEventId?: (string | null) | undefined;
  joinWebUrl?: (string | null) | undefined;
  organizer?:
    | (
        | (microsoft_graph_teamworkUserIdentity | {})
        | Array<microsoft_graph_teamworkUserIdentity | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamworkUserIdentity = microsoft_graph_identity & {
  userIdentityType?:
    | (
        | (microsoft_graph_teamworkUserIdentityType | {})
        | Array<microsoft_graph_teamworkUserIdentityType | {}>
      )
    | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_chatViewpoint = {
  isHidden?: (boolean | null) | undefined;
  lastMessageReadDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessageInfo = microsoft_graph_entity & {
  body?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  createdDateTime?: (string | null) | undefined;
  eventDetail?:
    | ((microsoft_graph_eventMessageDetail | {}) | Array<microsoft_graph_eventMessageDetail | {}>)
    | undefined;
  from?:
    | (
        | (microsoft_graph_chatMessageFromIdentitySet | {})
        | Array<microsoft_graph_chatMessageFromIdentitySet | {}>
      )
    | undefined;
  isDeleted?: (boolean | null) | undefined;
  messageType?: microsoft_graph_chatMessageType | undefined;
  '@odata.type': string;
};
type microsoft_graph_pinnedChatMessageInfo = microsoft_graph_entity & {
  message?:
    | ((microsoft_graph_chatMessage | {}) | Array<microsoft_graph_chatMessage | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_cloudClipboardRoot = microsoft_graph_entity & {
  items?: Array<microsoft_graph_cloudClipboardItem> | undefined;
  '@odata.type': string;
};
type microsoft_graph_cloudClipboardItem = microsoft_graph_entity & {
  createdDateTime?: string | undefined;
  expirationDateTime?: string | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  payloads?: Array<microsoft_graph_cloudClipboardItemPayload> | undefined;
  '@odata.type': string;
};
type microsoft_graph_cloudClipboardItemPayload = {
  content?: string | undefined;
  formatName?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_contact = microsoft_graph_outlookItem & {
  assistantName?: (string | null) | undefined;
  birthday?: (string | null) | undefined;
  businessAddress?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  businessHomePage?: (string | null) | undefined;
  businessPhones?: Array<string | null> | undefined;
  children?: Array<string | null> | undefined;
  companyName?: (string | null) | undefined;
  department?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  emailAddresses?: Array<microsoft_graph_emailAddress> | undefined;
  fileAs?: (string | null) | undefined;
  generation?: (string | null) | undefined;
  givenName?: (string | null) | undefined;
  homeAddress?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  homePhones?: Array<string | null> | undefined;
  imAddresses?: Array<string | null> | undefined;
  initials?: (string | null) | undefined;
  jobTitle?: (string | null) | undefined;
  manager?: (string | null) | undefined;
  middleName?: (string | null) | undefined;
  mobilePhone?: (string | null) | undefined;
  nickName?: (string | null) | undefined;
  officeLocation?: (string | null) | undefined;
  otherAddress?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  parentFolderId?: (string | null) | undefined;
  personalNotes?: (string | null) | undefined;
  profession?: (string | null) | undefined;
  spouseName?: (string | null) | undefined;
  surname?: (string | null) | undefined;
  title?: (string | null) | undefined;
  yomiCompanyName?: (string | null) | undefined;
  yomiGivenName?: (string | null) | undefined;
  yomiSurname?: (string | null) | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  photo?:
    | ((microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>)
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_deviceManagementTroubleshootingEvent = microsoft_graph_entity & {
  correlationId?: (string | null) | undefined;
  eventDateTime?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_employeeExperienceUser = microsoft_graph_entity & {
  learningCourseActivities?: Array<microsoft_graph_learningCourseActivity> | undefined;
  '@odata.type': string;
};
type microsoft_graph_learningCourseActivity = microsoft_graph_entity & {
  completedDateTime?: (string | null) | undefined;
  completionPercentage?: (number | null) | undefined;
  externalcourseActivityId?: (string | null) | undefined;
  learnerUserId?: string | undefined;
  learningContentId?: string | undefined;
  learningProviderId?: (string | null) | undefined;
  status?:
    | ((microsoft_graph_courseStatus | {}) | Array<microsoft_graph_courseStatus | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_courseStatus =
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'unknownFutureValue';
type microsoft_graph_inferenceClassification = microsoft_graph_entity & {
  overrides?: Array<microsoft_graph_inferenceClassificationOverride> | undefined;
  '@odata.type': string;
};
type microsoft_graph_inferenceClassificationOverride = microsoft_graph_entity & {
  classifyAs?:
    | (
        | (microsoft_graph_inferenceClassificationType | {})
        | Array<microsoft_graph_inferenceClassificationType | {}>
      )
    | undefined;
  senderEmailAddress?:
    | ((microsoft_graph_emailAddress | {}) | Array<microsoft_graph_emailAddress | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_inferenceClassificationType = 'focused' | 'other';
type microsoft_graph_itemInsights = microsoft_graph_officeGraphInsights & {
  '@odata.type': string;
};
type microsoft_graph_officeGraphInsights = microsoft_graph_entity & {
  shared?: Array<microsoft_graph_sharedInsight> | undefined;
  trending?: Array<microsoft_graph_trending> | undefined;
  used?: Array<microsoft_graph_usedInsight> | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharedInsight = microsoft_graph_entity & {
  lastShared?:
    | ((microsoft_graph_sharingDetail | {}) | Array<microsoft_graph_sharingDetail | {}>)
    | undefined;
  resourceReference?:
    | ((microsoft_graph_resourceReference | {}) | Array<microsoft_graph_resourceReference | {}>)
    | undefined;
  resourceVisualization?:
    | (
        | (microsoft_graph_resourceVisualization | {})
        | Array<microsoft_graph_resourceVisualization | {}>
      )
    | undefined;
  sharingHistory?: Array<microsoft_graph_sharingDetail> | undefined;
  lastSharedMethod?:
    | ((microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>)
    | undefined;
  resource?: ((microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharingDetail = {
  sharedBy?:
    | ((microsoft_graph_insightIdentity | {}) | Array<microsoft_graph_insightIdentity | {}>)
    | undefined;
  sharedDateTime?: (string | null) | undefined;
  sharingReference?:
    | ((microsoft_graph_resourceReference | {}) | Array<microsoft_graph_resourceReference | {}>)
    | undefined;
  sharingSubject?: (string | null) | undefined;
  sharingType?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_insightIdentity = {
  address?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  id?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_resourceReference = {
  id?: (string | null) | undefined;
  type?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_resourceVisualization = {
  containerDisplayName?: (string | null) | undefined;
  containerType?: (string | null) | undefined;
  containerWebUrl?: (string | null) | undefined;
  mediaType?: (string | null) | undefined;
  previewImageUrl?: (string | null) | undefined;
  previewText?: (string | null) | undefined;
  title?: (string | null) | undefined;
  type?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_trending = microsoft_graph_entity & {
  lastModifiedDateTime?: (string | null) | undefined;
  resourceReference?:
    | ((microsoft_graph_resourceReference | {}) | Array<microsoft_graph_resourceReference | {}>)
    | undefined;
  resourceVisualization?:
    | (
        | (microsoft_graph_resourceVisualization | {})
        | Array<microsoft_graph_resourceVisualization | {}>
      )
    | undefined;
  weight?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  resource?: ((microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_usedInsight = microsoft_graph_entity & {
  lastUsed?:
    | ((microsoft_graph_usageDetails | {}) | Array<microsoft_graph_usageDetails | {}>)
    | undefined;
  resourceReference?:
    | ((microsoft_graph_resourceReference | {}) | Array<microsoft_graph_resourceReference | {}>)
    | undefined;
  resourceVisualization?:
    | (
        | (microsoft_graph_resourceVisualization | {})
        | Array<microsoft_graph_resourceVisualization | {}>
      )
    | undefined;
  resource?: ((microsoft_graph_entity | {}) | Array<microsoft_graph_entity | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_usageDetails = {
  lastAccessedDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_licenseDetails = microsoft_graph_entity & {
  servicePlans?: Array<microsoft_graph_servicePlanInfo> | undefined;
  skuId?: (string | null) | undefined;
  skuPartNumber?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_servicePlanInfo = {
  appliesTo?: (string | null) | undefined;
  provisioningStatus?: (string | null) | undefined;
  servicePlanId?: (string | null) | undefined;
  servicePlanName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_messageRule = microsoft_graph_entity & {
  actions?:
    | ((microsoft_graph_messageRuleActions | {}) | Array<microsoft_graph_messageRuleActions | {}>)
    | undefined;
  conditions?:
    | (
        | (microsoft_graph_messageRulePredicates | {})
        | Array<microsoft_graph_messageRulePredicates | {}>
      )
    | undefined;
  displayName?: (string | null) | undefined;
  exceptions?:
    | (
        | (microsoft_graph_messageRulePredicates | {})
        | Array<microsoft_graph_messageRulePredicates | {}>
      )
    | undefined;
  hasError?: (boolean | null) | undefined;
  isEnabled?: (boolean | null) | undefined;
  isReadOnly?: (boolean | null) | undefined;
  sequence?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_messageRuleActions = {
  assignCategories?: Array<string | null> | undefined;
  copyToFolder?: (string | null) | undefined;
  delete?: (boolean | null) | undefined;
  forwardAsAttachmentTo?: Array<microsoft_graph_recipient> | undefined;
  forwardTo?: Array<microsoft_graph_recipient> | undefined;
  markAsRead?: (boolean | null) | undefined;
  markImportance?:
    | ((microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>)
    | undefined;
  moveToFolder?: (string | null) | undefined;
  permanentDelete?: (boolean | null) | undefined;
  redirectTo?: Array<microsoft_graph_recipient> | undefined;
  stopProcessingRules?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_messageRulePredicates = {
  bodyContains?: Array<string | null> | undefined;
  bodyOrSubjectContains?: Array<string | null> | undefined;
  categories?: Array<string | null> | undefined;
  fromAddresses?: Array<microsoft_graph_recipient> | undefined;
  hasAttachments?: (boolean | null) | undefined;
  headerContains?: Array<string | null> | undefined;
  importance?:
    | ((microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>)
    | undefined;
  isApprovalRequest?: (boolean | null) | undefined;
  isAutomaticForward?: (boolean | null) | undefined;
  isAutomaticReply?: (boolean | null) | undefined;
  isEncrypted?: (boolean | null) | undefined;
  isMeetingRequest?: (boolean | null) | undefined;
  isMeetingResponse?: (boolean | null) | undefined;
  isNonDeliveryReport?: (boolean | null) | undefined;
  isPermissionControlled?: (boolean | null) | undefined;
  isReadReceipt?: (boolean | null) | undefined;
  isSigned?: (boolean | null) | undefined;
  isVoicemail?: (boolean | null) | undefined;
  messageActionFlag?:
    | ((microsoft_graph_messageActionFlag | {}) | Array<microsoft_graph_messageActionFlag | {}>)
    | undefined;
  notSentToMe?: (boolean | null) | undefined;
  recipientContains?: Array<string | null> | undefined;
  senderContains?: Array<string | null> | undefined;
  sensitivity?:
    | ((microsoft_graph_sensitivity | {}) | Array<microsoft_graph_sensitivity | {}>)
    | undefined;
  sentCcMe?: (boolean | null) | undefined;
  sentOnlyToMe?: (boolean | null) | undefined;
  sentToAddresses?: Array<microsoft_graph_recipient> | undefined;
  sentToMe?: (boolean | null) | undefined;
  sentToOrCcMe?: (boolean | null) | undefined;
  subjectContains?: Array<string | null> | undefined;
  withinSizeRange?:
    | ((microsoft_graph_sizeRange | {}) | Array<microsoft_graph_sizeRange | {}>)
    | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_sizeRange = {
  maximumSize?: (number | null) | undefined;
  minimumSize?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_message = microsoft_graph_outlookItem & {
  bccRecipients?: Array<microsoft_graph_recipient> | undefined;
  body?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  bodyPreview?: (string | null) | undefined;
  ccRecipients?: Array<microsoft_graph_recipient> | undefined;
  conversationId?: (string | null) | undefined;
  conversationIndex?: (string | null) | undefined;
  flag?:
    | ((microsoft_graph_followupFlag | {}) | Array<microsoft_graph_followupFlag | {}>)
    | undefined;
  from?: ((microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>) | undefined;
  hasAttachments?: (boolean | null) | undefined;
  importance?:
    | ((microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>)
    | undefined;
  inferenceClassification?:
    | (
        | (microsoft_graph_inferenceClassificationType | {})
        | Array<microsoft_graph_inferenceClassificationType | {}>
      )
    | undefined;
  internetMessageHeaders?: Array<microsoft_graph_internetMessageHeader> | undefined;
  internetMessageId?: (string | null) | undefined;
  isDeliveryReceiptRequested?: (boolean | null) | undefined;
  isDraft?: (boolean | null) | undefined;
  isRead?: (boolean | null) | undefined;
  isReadReceiptRequested?: (boolean | null) | undefined;
  parentFolderId?: (string | null) | undefined;
  receivedDateTime?: (string | null) | undefined;
  replyTo?: Array<microsoft_graph_recipient> | undefined;
  sender?: ((microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>) | undefined;
  sentDateTime?: (string | null) | undefined;
  subject?: (string | null) | undefined;
  toRecipients?: Array<microsoft_graph_recipient> | undefined;
  uniqueBody?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  webLink?: (string | null) | undefined;
  attachments?: Array<microsoft_graph_attachment> | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_followupFlag = {
  completedDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  dueDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  flagStatus?:
    | ((microsoft_graph_followupFlagStatus | {}) | Array<microsoft_graph_followupFlagStatus | {}>)
    | undefined;
  startDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_followupFlagStatus = 'notFlagged' | 'complete' | 'flagged';
type microsoft_graph_internetMessageHeader = {
  name?: (string | null) | undefined;
  value?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_managedAppRegistration = microsoft_graph_entity & {
  appIdentifier?:
    | ((microsoft_graph_mobileAppIdentifier | {}) | Array<microsoft_graph_mobileAppIdentifier | {}>)
    | undefined;
  applicationVersion?: (string | null) | undefined;
  createdDateTime?: string | undefined;
  deviceName?: (string | null) | undefined;
  deviceTag?: (string | null) | undefined;
  deviceType?: (string | null) | undefined;
  flaggedReasons?: Array<microsoft_graph_managedAppFlaggedReason> | undefined;
  lastSyncDateTime?: string | undefined;
  managementSdkVersion?: (string | null) | undefined;
  platformVersion?: (string | null) | undefined;
  userId?: (string | null) | undefined;
  version?: (string | null) | undefined;
  appliedPolicies?: Array<microsoft_graph_managedAppPolicy> | undefined;
  intendedPolicies?: Array<microsoft_graph_managedAppPolicy> | undefined;
  operations?: Array<microsoft_graph_managedAppOperation> | undefined;
  '@odata.type': string;
};
type microsoft_graph_mobileAppIdentifier = {
  '@odata.type': string;
};
type microsoft_graph_managedAppFlaggedReason = 'none' | 'rootedDevice';
type microsoft_graph_managedAppPolicy = microsoft_graph_entity & {
  createdDateTime?: string | undefined;
  description?: (string | null) | undefined;
  displayName?: string | undefined;
  lastModifiedDateTime?: string | undefined;
  version?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_managedAppOperation = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  lastModifiedDateTime?: string | undefined;
  state?: (string | null) | undefined;
  version?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_complianceState =
  | 'unknown'
  | 'compliant'
  | 'noncompliant'
  | 'conflict'
  | 'error'
  | 'inGracePeriod'
  | 'configManager';
type microsoft_graph_configurationManagerClientEnabledFeatures = {
  compliancePolicy?: boolean | undefined;
  deviceConfiguration?: boolean | undefined;
  inventory?: boolean | undefined;
  modernApps?: boolean | undefined;
  resourceAccess?: boolean | undefined;
  windowsUpdateForBusiness?: boolean | undefined;
  '@odata.type': string;
};
type microsoft_graph_deviceActionResult = {
  actionName?: (string | null) | undefined;
  actionState?: microsoft_graph_actionState | undefined;
  lastUpdatedDateTime?: string | undefined;
  startDateTime?: string | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_deviceHealthAttestationState = {
  attestationIdentityKey?: (string | null) | undefined;
  bitLockerStatus?: (string | null) | undefined;
  bootAppSecurityVersion?: (string | null) | undefined;
  bootDebugging?: (string | null) | undefined;
  bootManagerSecurityVersion?: (string | null) | undefined;
  bootManagerVersion?: (string | null) | undefined;
  bootRevisionListInfo?: (string | null) | undefined;
  codeIntegrity?: (string | null) | undefined;
  codeIntegrityCheckVersion?: (string | null) | undefined;
  codeIntegrityPolicy?: (string | null) | undefined;
  contentNamespaceUrl?: (string | null) | undefined;
  contentVersion?: (string | null) | undefined;
  dataExcutionPolicy?: (string | null) | undefined;
  deviceHealthAttestationStatus?: (string | null) | undefined;
  earlyLaunchAntiMalwareDriverProtection?: (string | null) | undefined;
  healthAttestationSupportedStatus?: (string | null) | undefined;
  healthStatusMismatchInfo?: (string | null) | undefined;
  issuedDateTime?: string | undefined;
  lastUpdateDateTime?: (string | null) | undefined;
  operatingSystemKernelDebugging?: (string | null) | undefined;
  operatingSystemRevListInfo?: (string | null) | undefined;
  pcr0?: (string | null) | undefined;
  pcrHashAlgorithm?: (string | null) | undefined;
  resetCount?: number | undefined;
  restartCount?: number | undefined;
  safeMode?: (string | null) | undefined;
  secureBoot?: (string | null) | undefined;
  secureBootConfigurationPolicyFingerPrint?: (string | null) | undefined;
  testSigning?: (string | null) | undefined;
  tpmVersion?: (string | null) | undefined;
  virtualSecureMode?: (string | null) | undefined;
  windowsPE?: (string | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_deviceCategory = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_deviceCompliancePolicyState = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  platformType?: microsoft_graph_policyPlatformType | undefined;
  settingCount?: number | undefined;
  settingStates?: Array<microsoft_graph_deviceCompliancePolicySettingState> | undefined;
  state?: microsoft_graph_complianceStatus | undefined;
  version?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_policyPlatformType =
  | 'android'
  | 'androidForWork'
  | 'iOS'
  | 'macOS'
  | 'windowsPhone81'
  | 'windows81AndLater'
  | 'windows10AndLater'
  | 'all';
type microsoft_graph_deviceCompliancePolicySettingState = {
  currentValue?: (string | null) | undefined;
  errorCode?: number | undefined;
  errorDescription?: (string | null) | undefined;
  instanceDisplayName?: (string | null) | undefined;
  setting?: (string | null) | undefined;
  settingName?: (string | null) | undefined;
  sources?: Array<microsoft_graph_settingSource> | undefined;
  state?: microsoft_graph_complianceStatus | undefined;
  userEmail?: (string | null) | undefined;
  userId?: (string | null) | undefined;
  userName?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_settingSource = {
  displayName?: (string | null) | undefined;
  id?: (string | null) | undefined;
  sourceType?: microsoft_graph_settingSourceType | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_deviceConfigurationState = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  platformType?: microsoft_graph_policyPlatformType | undefined;
  settingCount?: number | undefined;
  settingStates?: Array<microsoft_graph_deviceConfigurationSettingState> | undefined;
  state?: microsoft_graph_complianceStatus | undefined;
  version?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_deviceConfigurationSettingState = {
  currentValue?: (string | null) | undefined;
  errorCode?: number | undefined;
  errorDescription?: (string | null) | undefined;
  instanceDisplayName?: (string | null) | undefined;
  setting?: (string | null) | undefined;
  settingName?: (string | null) | undefined;
  sources?: Array<microsoft_graph_settingSource> | undefined;
  state?: microsoft_graph_complianceStatus | undefined;
  userEmail?: (string | null) | undefined;
  userId?: (string | null) | undefined;
  userName?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_deviceLogCollectionResponse = microsoft_graph_entity & {
  enrolledByUser?: (string | null) | undefined;
  expirationDateTimeUTC?: (string | null) | undefined;
  initiatedByUserPrincipalName?: (string | null) | undefined;
  managedDeviceId?: string | undefined;
  receivedDateTimeUTC?: (string | null) | undefined;
  requestedDateTimeUTC?: (string | null) | undefined;
  sizeInKB?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  status?: microsoft_graph_appLogUploadState | undefined;
  '@odata.type': string;
};
type microsoft_graph_appLogUploadState = 'pending' | 'completed' | 'failed' | 'unknownFutureValue';
type microsoft_graph_windowsProtectionState = microsoft_graph_entity & {
  antiMalwareVersion?: (string | null) | undefined;
  deviceState?:
    | (
        | (microsoft_graph_windowsDeviceHealthState | {})
        | Array<microsoft_graph_windowsDeviceHealthState | {}>
      )
    | undefined;
  engineVersion?: (string | null) | undefined;
  fullScanOverdue?: (boolean | null) | undefined;
  fullScanRequired?: (boolean | null) | undefined;
  isVirtualMachine?: (boolean | null) | undefined;
  lastFullScanDateTime?: (string | null) | undefined;
  lastFullScanSignatureVersion?: (string | null) | undefined;
  lastQuickScanDateTime?: (string | null) | undefined;
  lastQuickScanSignatureVersion?: (string | null) | undefined;
  lastReportedDateTime?: (string | null) | undefined;
  malwareProtectionEnabled?: (boolean | null) | undefined;
  networkInspectionSystemEnabled?: (boolean | null) | undefined;
  productStatus?:
    | (
        | (microsoft_graph_windowsDefenderProductStatus | {})
        | Array<microsoft_graph_windowsDefenderProductStatus | {}>
      )
    | undefined;
  quickScanOverdue?: (boolean | null) | undefined;
  realTimeProtectionEnabled?: (boolean | null) | undefined;
  rebootRequired?: (boolean | null) | undefined;
  signatureUpdateOverdue?: (boolean | null) | undefined;
  signatureVersion?: (string | null) | undefined;
  tamperProtectionEnabled?: (boolean | null) | undefined;
  detectedMalwareState?: Array<microsoft_graph_windowsDeviceMalwareState> | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_windowsDeviceMalwareState = microsoft_graph_entity & {
  additionalInformationUrl?: (string | null) | undefined;
  category?:
    | (
        | (microsoft_graph_windowsMalwareCategory | {})
        | Array<microsoft_graph_windowsMalwareCategory | {}>
      )
    | undefined;
  detectionCount?: (number | null) | undefined;
  displayName?: (string | null) | undefined;
  executionState?:
    | (
        | (microsoft_graph_windowsMalwareExecutionState | {})
        | Array<microsoft_graph_windowsMalwareExecutionState | {}>
      )
    | undefined;
  initialDetectionDateTime?: (string | null) | undefined;
  lastStateChangeDateTime?: (string | null) | undefined;
  severity?:
    | (
        | (microsoft_graph_windowsMalwareSeverity | {})
        | Array<microsoft_graph_windowsMalwareSeverity | {}>
      )
    | undefined;
  state?:
    | ((microsoft_graph_windowsMalwareState | {}) | Array<microsoft_graph_windowsMalwareState | {}>)
    | undefined;
  threatState?:
    | (
        | (microsoft_graph_windowsMalwareThreatState | {})
        | Array<microsoft_graph_windowsMalwareThreatState | {}>
      )
    | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_oAuth2PermissionGrant = microsoft_graph_entity & {
  clientId?: string | undefined;
  consentType?: (string | null) | undefined;
  principalId?: (string | null) | undefined;
  resourceId?: string | undefined;
  scope?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onlineMeeting = microsoft_graph_onlineMeetingBase & {
  attendeeReport?: (string | null) | undefined;
  broadcastSettings?:
    | (
        | (microsoft_graph_broadcastMeetingSettings | {})
        | Array<microsoft_graph_broadcastMeetingSettings | {}>
      )
    | undefined;
  creationDateTime?: (string | null) | undefined;
  endDateTime?: (string | null) | undefined;
  externalId?: (string | null) | undefined;
  isBroadcast?: (boolean | null) | undefined;
  meetingTemplateId?: (string | null) | undefined;
  participants?:
    | ((microsoft_graph_meetingParticipants | {}) | Array<microsoft_graph_meetingParticipants | {}>)
    | undefined;
  startDateTime?: (string | null) | undefined;
  recordings?: Array<microsoft_graph_callRecording> | undefined;
  transcripts?: Array<microsoft_graph_callTranscript> | undefined;
  '@odata.type': string;
};
type microsoft_graph_onlineMeetingBase = microsoft_graph_entity & {
  allowAttendeeToEnableCamera?: (boolean | null) | undefined;
  allowAttendeeToEnableMic?: (boolean | null) | undefined;
  allowBreakoutRooms?: (boolean | null) | undefined;
  allowedLobbyAdmitters?:
    | (
        | (microsoft_graph_allowedLobbyAdmitterRoles | {})
        | Array<microsoft_graph_allowedLobbyAdmitterRoles | {}>
      )
    | undefined;
  allowedPresenters?:
    | (
        | (microsoft_graph_onlineMeetingPresenters | {})
        | Array<microsoft_graph_onlineMeetingPresenters | {}>
      )
    | undefined;
  allowLiveShare?:
    | (
        | (microsoft_graph_meetingLiveShareOptions | {})
        | Array<microsoft_graph_meetingLiveShareOptions | {}>
      )
    | undefined;
  allowMeetingChat?:
    | ((microsoft_graph_meetingChatMode | {}) | Array<microsoft_graph_meetingChatMode | {}>)
    | undefined;
  allowParticipantsToChangeName?: (boolean | null) | undefined;
  allowPowerPointSharing?: (boolean | null) | undefined;
  allowRecording?: (boolean | null) | undefined;
  allowTeamworkReactions?: (boolean | null) | undefined;
  allowTranscription?: (boolean | null) | undefined;
  allowWhiteboard?: (boolean | null) | undefined;
  audioConferencing?:
    | ((microsoft_graph_audioConferencing | {}) | Array<microsoft_graph_audioConferencing | {}>)
    | undefined;
  chatInfo?: ((microsoft_graph_chatInfo | {}) | Array<microsoft_graph_chatInfo | {}>) | undefined;
  chatRestrictions?:
    | ((microsoft_graph_chatRestrictions | {}) | Array<microsoft_graph_chatRestrictions | {}>)
    | undefined;
  isEntryExitAnnounced?: (boolean | null) | undefined;
  joinInformation?:
    | ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>)
    | undefined;
  joinMeetingIdSettings?:
    | (
        | (microsoft_graph_joinMeetingIdSettings | {})
        | Array<microsoft_graph_joinMeetingIdSettings | {}>
      )
    | undefined;
  joinWebUrl?: (string | null) | undefined;
  lobbyBypassSettings?:
    | ((microsoft_graph_lobbyBypassSettings | {}) | Array<microsoft_graph_lobbyBypassSettings | {}>)
    | undefined;
  recordAutomatically?: (boolean | null) | undefined;
  shareMeetingChatHistoryDefault?:
    | (
        | (microsoft_graph_meetingChatHistoryDefaultMode | {})
        | Array<microsoft_graph_meetingChatHistoryDefaultMode | {}>
      )
    | undefined;
  subject?: (string | null) | undefined;
  videoTeleconferenceId?: (string | null) | undefined;
  watermarkProtection?:
    | (
        | (microsoft_graph_watermarkProtectionValues | {})
        | Array<microsoft_graph_watermarkProtectionValues | {}>
      )
    | undefined;
  attendanceReports?: Array<microsoft_graph_meetingAttendanceReport> | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_audioConferencing = {
  conferenceId?: (string | null) | undefined;
  dialinUrl?: (string | null) | undefined;
  tollFreeNumber?: (string | null) | undefined;
  tollFreeNumbers?: Array<string | null> | undefined;
  tollNumber?: (string | null) | undefined;
  tollNumbers?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatInfo = {
  messageId?: (string | null) | undefined;
  replyChainMessageId?: (string | null) | undefined;
  threadId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatRestrictions = {
  allowTextOnly?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_joinMeetingIdSettings = {
  isPasscodeRequired?: (boolean | null) | undefined;
  joinMeetingId?: (string | null) | undefined;
  passcode?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_lobbyBypassSettings = {
  isDialInBypassEnabled?: (boolean | null) | undefined;
  scope?:
    | ((microsoft_graph_lobbyBypassScope | {}) | Array<microsoft_graph_lobbyBypassScope | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_lobbyBypassScope =
  | 'organizer'
  | 'organization'
  | 'organizationAndFederated'
  | 'everyone'
  | 'unknownFutureValue'
  | 'invited'
  | 'organizationExcludingGuests';
type microsoft_graph_meetingChatHistoryDefaultMode = 'none' | 'all' | 'unknownFutureValue';
type microsoft_graph_watermarkProtectionValues = {
  isEnabledForContentSharing?: (boolean | null) | undefined;
  isEnabledForVideo?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_meetingAttendanceReport = microsoft_graph_entity & {
  externalEventInformation?: Array<microsoft_graph_virtualEventExternalInformation> | undefined;
  meetingEndDateTime?: (string | null) | undefined;
  meetingStartDateTime?: (string | null) | undefined;
  totalParticipantCount?: (number | null) | undefined;
  attendanceRecords?: Array<microsoft_graph_attendanceRecord> | undefined;
  '@odata.type': string;
};
type microsoft_graph_virtualEventExternalInformation = {
  applicationId?: (string | null) | undefined;
  externalEventId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_attendanceRecord = microsoft_graph_entity & {
  attendanceIntervals?: Array<microsoft_graph_attendanceInterval> | undefined;
  emailAddress?: (string | null) | undefined;
  externalRegistrationInformation?:
    | (
        | (microsoft_graph_virtualEventExternalRegistrationInformation | {})
        | Array<microsoft_graph_virtualEventExternalRegistrationInformation | {}>
      )
    | undefined;
  identity?: ((microsoft_graph_identity | {}) | Array<microsoft_graph_identity | {}>) | undefined;
  registrationId?: (string | null) | undefined;
  role?: (string | null) | undefined;
  totalAttendanceInSeconds?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_attendanceInterval = {
  durationInSeconds?: (number | null) | undefined;
  joinDateTime?: (string | null) | undefined;
  leaveDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_virtualEventExternalRegistrationInformation = {
  referrer?: (string | null) | undefined;
  registrationId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_broadcastMeetingSettings = {
  allowedAudience?:
    | (
        | (microsoft_graph_broadcastMeetingAudience | {})
        | Array<microsoft_graph_broadcastMeetingAudience | {}>
      )
    | undefined;
  captions?:
    | (
        | (microsoft_graph_broadcastMeetingCaptionSettings | {})
        | Array<microsoft_graph_broadcastMeetingCaptionSettings | {}>
      )
    | undefined;
  isAttendeeReportEnabled?: (boolean | null) | undefined;
  isQuestionAndAnswerEnabled?: (boolean | null) | undefined;
  isRecordingEnabled?: (boolean | null) | undefined;
  isVideoOnDemandEnabled?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_broadcastMeetingAudience =
  | 'roleIsAttendee'
  | 'organization'
  | 'everyone'
  | 'unknownFutureValue';
type microsoft_graph_broadcastMeetingCaptionSettings = {
  isCaptionEnabled?: (boolean | null) | undefined;
  spokenLanguage?: (string | null) | undefined;
  translationLanguages?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_meetingParticipants = {
  attendees?: Array<microsoft_graph_meetingParticipantInfo> | undefined;
  organizer?:
    | (
        | (microsoft_graph_meetingParticipantInfo | {})
        | Array<microsoft_graph_meetingParticipantInfo | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_meetingParticipantInfo = {
  identity?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  role?:
    | ((microsoft_graph_onlineMeetingRole | {}) | Array<microsoft_graph_onlineMeetingRole | {}>)
    | undefined;
  upn?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_onlineMeetingRole =
  | 'attendee'
  | 'presenter'
  | 'unknownFutureValue'
  | 'producer'
  | 'coorganizer';
type microsoft_graph_callRecording = microsoft_graph_entity & {
  callId?: (string | null) | undefined;
  content?: (string | null) | undefined;
  contentCorrelationId?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  endDateTime?: (string | null) | undefined;
  meetingId?: (string | null) | undefined;
  meetingOrganizer?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  recordingContentUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_callTranscript = microsoft_graph_entity & {
  callId?: (string | null) | undefined;
  content?: (string | null) | undefined;
  contentCorrelationId?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  endDateTime?: (string | null) | undefined;
  meetingId?: (string | null) | undefined;
  meetingOrganizer?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  metadataContent?: (string | null) | undefined;
  transcriptContentUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_outlookUser = microsoft_graph_entity & {
  masterCategories?: Array<microsoft_graph_outlookCategory> | undefined;
  '@odata.type': string;
};
type microsoft_graph_outlookCategory = microsoft_graph_entity & {
  color?:
    | ((microsoft_graph_categoryColor | {}) | Array<microsoft_graph_categoryColor | {}>)
    | undefined;
  displayName?: (string | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_person = microsoft_graph_entity & {
  birthday?: (string | null) | undefined;
  companyName?: (string | null) | undefined;
  department?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  givenName?: (string | null) | undefined;
  imAddress?: (string | null) | undefined;
  isFavorite?: (boolean | null) | undefined;
  jobTitle?: (string | null) | undefined;
  officeLocation?: (string | null) | undefined;
  personNotes?: (string | null) | undefined;
  personType?:
    | ((microsoft_graph_personType | {}) | Array<microsoft_graph_personType | {}>)
    | undefined;
  phones?: Array<microsoft_graph_phone> | undefined;
  postalAddresses?: Array<microsoft_graph_location> | undefined;
  profession?: (string | null) | undefined;
  scoredEmailAddresses?: Array<microsoft_graph_scoredEmailAddress> | undefined;
  surname?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  websites?: Array<microsoft_graph_website> | undefined;
  yomiCompany?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_personType = {
  class?: (string | null) | undefined;
  subclass?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_scoredEmailAddress = {
  address?: (string | null) | undefined;
  itemId?: (string | null) | undefined;
  relevanceScore?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  selectionLikelihood?:
    | (
        | (microsoft_graph_selectionLikelihoodInfo | {})
        | Array<microsoft_graph_selectionLikelihoodInfo | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_selectionLikelihoodInfo = 'notSpecified' | 'high';
type microsoft_graph_website = {
  address?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  type?: ((microsoft_graph_websiteType | {}) | Array<microsoft_graph_websiteType | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_websiteType = 'other' | 'home' | 'work' | 'blog' | 'profile';
type microsoft_graph_plannerUser = microsoft_graph_entity & {
  plans?: Array<microsoft_graph_plannerPlan> | undefined;
  tasks?: Array<microsoft_graph_plannerTask> | undefined;
  '@odata.type': string;
};
type microsoft_graph_presence = microsoft_graph_entity & {
  activity?: (string | null) | undefined;
  availability?: (string | null) | undefined;
  statusMessage?:
    | (
        | (microsoft_graph_presenceStatusMessage | {})
        | Array<microsoft_graph_presenceStatusMessage | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_presenceStatusMessage = {
  expiryDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  message?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  publishedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_scopedRoleMembership = microsoft_graph_entity & {
  administrativeUnitId?: string | undefined;
  roleId?: string | undefined;
  roleMemberInfo?: microsoft_graph_identity | undefined;
  '@odata.type': string;
};
type microsoft_graph_userSettings = microsoft_graph_entity & {
  contributionToContentDiscoveryAsOrganizationDisabled?: boolean | undefined;
  contributionToContentDiscoveryDisabled?: boolean | undefined;
  itemInsights?:
    | (
        | (microsoft_graph_userInsightsSettings | {})
        | Array<microsoft_graph_userInsightsSettings | {}>
      )
    | undefined;
  shiftPreferences?:
    | ((microsoft_graph_shiftPreferences | {}) | Array<microsoft_graph_shiftPreferences | {}>)
    | undefined;
  storage?:
    | ((microsoft_graph_userStorage | {}) | Array<microsoft_graph_userStorage | {}>)
    | undefined;
  windows?: Array<microsoft_graph_windowsSetting> | undefined;
  '@odata.type': string;
};
type microsoft_graph_userInsightsSettings = microsoft_graph_entity & {
  isEnabled?: boolean | undefined;
  '@odata.type': string;
};
type microsoft_graph_shiftPreferences = microsoft_graph_changeTrackedEntity & {
  availability?: Array<microsoft_graph_shiftAvailability> | undefined;
  '@odata.type': string;
};
type microsoft_graph_shiftAvailability = {
  recurrence?:
    | ((microsoft_graph_patternedRecurrence | {}) | Array<microsoft_graph_patternedRecurrence | {}>)
    | undefined;
  timeSlots?: Array<microsoft_graph_timeRange> | undefined;
  timeZone?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_timeRange = {
  endTime?: (string | null) | undefined;
  startTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_userStorage = microsoft_graph_entity & {
  quota?:
    | ((microsoft_graph_unifiedStorageQuota | {}) | Array<microsoft_graph_unifiedStorageQuota | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_unifiedStorageQuota = microsoft_graph_entity & {
  deleted?: (number | null) | undefined;
  manageWebUrl?: (string | null) | undefined;
  remaining?: (number | null) | undefined;
  state?: (string | null) | undefined;
  total?: (number | null) | undefined;
  used?: (number | null) | undefined;
  services?: Array<microsoft_graph_serviceStorageQuotaBreakdown> | undefined;
  '@odata.type': string;
};
type microsoft_graph_serviceStorageQuotaBreakdown = microsoft_graph_storageQuotaBreakdown & {
  '@odata.type': string;
};
type microsoft_graph_storageQuotaBreakdown = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  manageWebUrl?: (string | null) | undefined;
  used?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_windowsSetting = microsoft_graph_entity & {
  payloadType?: (string | null) | undefined;
  settingType?: microsoft_graph_windowsSettingType | undefined;
  windowsDeviceId?: (string | null) | undefined;
  instances?: Array<microsoft_graph_windowsSettingInstance> | undefined;
  '@odata.type': string;
};
type microsoft_graph_windowsSettingType = 'roaming' | 'backup' | 'unknownFutureValue';
type microsoft_graph_windowsSettingInstance = microsoft_graph_entity & {
  createdDateTime?: string | undefined;
  expirationDateTime?: string | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  payload?: string | undefined;
  '@odata.type': string;
};
type microsoft_graph_userSolutionRoot = microsoft_graph_entity & {
  workingTimeSchedule?:
    | ((microsoft_graph_workingTimeSchedule | {}) | Array<microsoft_graph_workingTimeSchedule | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workingTimeSchedule = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_userScopeTeamsAppInstallation = microsoft_graph_teamsAppInstallation & {
  chat?: ((microsoft_graph_chat | {}) | Array<microsoft_graph_chat | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_todo = microsoft_graph_entity & {
  lists?: Array<microsoft_graph_todoTaskList> | undefined;
  '@odata.type': string;
};
type microsoft_graph_todoTaskList = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  isOwner?: boolean | undefined;
  isShared?: boolean | undefined;
  wellknownListName?: microsoft_graph_wellknownListName | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  tasks?: Array<microsoft_graph_todoTask> | undefined;
  '@odata.type': string;
};
type microsoft_graph_wellknownListName =
  | 'none'
  | 'defaultList'
  | 'flaggedEmails'
  | 'unknownFutureValue';
type microsoft_graph_todoTask = microsoft_graph_entity & {
  body?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  bodyLastModifiedDateTime?: string | undefined;
  categories?: Array<string | null> | undefined;
  completedDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  createdDateTime?: string | undefined;
  dueDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  hasAttachments?: (boolean | null) | undefined;
  importance?: microsoft_graph_importance | undefined;
  isReminderOn?: boolean | undefined;
  lastModifiedDateTime?: string | undefined;
  recurrence?:
    | ((microsoft_graph_patternedRecurrence | {}) | Array<microsoft_graph_patternedRecurrence | {}>)
    | undefined;
  reminderDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  startDateTime?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  status?: microsoft_graph_taskStatus | undefined;
  title?: (string | null) | undefined;
  attachments?: Array<microsoft_graph_attachmentBase> | undefined;
  attachmentSessions?: Array<microsoft_graph_attachmentSession> | undefined;
  checklistItems?: Array<microsoft_graph_checklistItem> | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  linkedResources?: Array<microsoft_graph_linkedResource> | undefined;
  '@odata.type': string;
};
type microsoft_graph_taskStatus =
  | 'notStarted'
  | 'inProgress'
  | 'completed'
  | 'waitingOnOthers'
  | 'deferred';
type microsoft_graph_attachmentBase = microsoft_graph_entity & {
  contentType?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  name?: (string | null) | undefined;
  size?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_attachmentSession = microsoft_graph_entity & {
  content?: (string | null) | undefined;
  expirationDateTime?: (string | null) | undefined;
  nextExpectedRanges?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_checklistItem = microsoft_graph_entity & {
  checkedDateTime?: (string | null) | undefined;
  createdDateTime?: string | undefined;
  displayName?: (string | null) | undefined;
  isChecked?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_linkedResource = microsoft_graph_entity & {
  applicationName?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  externalId?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_quota = {
  deleted?: (number | null) | undefined;
  remaining?: (number | null) | undefined;
  state?: (string | null) | undefined;
  storagePlanInformation?:
    | (
        | (microsoft_graph_storagePlanInformation | {})
        | Array<microsoft_graph_storagePlanInformation | {}>
      )
    | undefined;
  total?: (number | null) | undefined;
  used?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_storagePlanInformation = {
  upgradeAvailable?: (boolean | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageResourceRoleScope = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  role?:
    | (
        | (microsoft_graph_accessPackageResourceRole | {})
        | Array<microsoft_graph_accessPackageResourceRole | {}>
      )
    | undefined;
  scope?:
    | (
        | (microsoft_graph_accessPackageResourceScope | {})
        | Array<microsoft_graph_accessPackageResourceScope | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageAssignmentPolicy = microsoft_graph_entity & {
  allowedTargetScope?:
    | ((microsoft_graph_allowedTargetScope | {}) | Array<microsoft_graph_allowedTargetScope | {}>)
    | undefined;
  automaticRequestSettings?:
    | (
        | (microsoft_graph_accessPackageAutomaticRequestSettings | {})
        | Array<microsoft_graph_accessPackageAutomaticRequestSettings | {}>
      )
    | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  expiration?:
    | ((microsoft_graph_expirationPattern | {}) | Array<microsoft_graph_expirationPattern | {}>)
    | undefined;
  modifiedDateTime?: (string | null) | undefined;
  notificationSettings?:
    | (
        | (microsoft_graph_accessPackageNotificationSettings | {})
        | Array<microsoft_graph_accessPackageNotificationSettings | {}>
      )
    | undefined;
  requestApprovalSettings?:
    | (
        | (microsoft_graph_accessPackageAssignmentApprovalSettings | {})
        | Array<microsoft_graph_accessPackageAssignmentApprovalSettings | {}>
      )
    | undefined;
  requestorSettings?:
    | (
        | (microsoft_graph_accessPackageAssignmentRequestorSettings | {})
        | Array<microsoft_graph_accessPackageAssignmentRequestorSettings | {}>
      )
    | undefined;
  reviewSettings?:
    | (
        | (microsoft_graph_accessPackageAssignmentReviewSettings | {})
        | Array<microsoft_graph_accessPackageAssignmentReviewSettings | {}>
      )
    | undefined;
  specificAllowedTargets?: Array<microsoft_graph_subjectSet> | undefined;
  accessPackage?:
    | ((microsoft_graph_accessPackage | {}) | Array<microsoft_graph_accessPackage | {}>)
    | undefined;
  catalog?:
    | (
        | (microsoft_graph_accessPackageCatalog | {})
        | Array<microsoft_graph_accessPackageCatalog | {}>
      )
    | undefined;
  customExtensionStageSettings?: Array<microsoft_graph_customExtensionStageSetting> | undefined;
  questions?: Array<microsoft_graph_accessPackageQuestion> | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageCatalog = microsoft_graph_entity & {
  catalogType?:
    | (
        | (microsoft_graph_accessPackageCatalogType | {})
        | Array<microsoft_graph_accessPackageCatalogType | {}>
      )
    | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isExternallyVisible?: (boolean | null) | undefined;
  modifiedDateTime?: (string | null) | undefined;
  state?:
    | (
        | (microsoft_graph_accessPackageCatalogState | {})
        | Array<microsoft_graph_accessPackageCatalogState | {}>
      )
    | undefined;
  accessPackages?: Array<microsoft_graph_accessPackage> | undefined;
  customWorkflowExtensions?: Array<microsoft_graph_customCalloutExtension> | undefined;
  resourceRoles?: Array<microsoft_graph_accessPackageResourceRole> | undefined;
  resources?: Array<microsoft_graph_accessPackageResource> | undefined;
  resourceScopes?: Array<microsoft_graph_accessPackageResourceScope> | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageResource = microsoft_graph_entity & {
  attributes?: Array<microsoft_graph_accessPackageResourceAttribute> | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  modifiedDateTime?: (string | null) | undefined;
  originId?: (string | null) | undefined;
  originSystem?: (string | null) | undefined;
  environment?:
    | (
        | (microsoft_graph_accessPackageResourceEnvironment | {})
        | Array<microsoft_graph_accessPackageResourceEnvironment | {}>
      )
    | undefined;
  roles?: Array<microsoft_graph_accessPackageResourceRole> | undefined;
  scopes?: Array<microsoft_graph_accessPackageResourceScope> | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageResourceEnvironment = microsoft_graph_entity & {
  connectionInfo?:
    | ((microsoft_graph_connectionInfo | {}) | Array<microsoft_graph_connectionInfo | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isDefaultEnvironment?: (boolean | null) | undefined;
  modifiedDateTime?: (string | null) | undefined;
  originId?: (string | null) | undefined;
  originSystem?: (string | null) | undefined;
  resources?: Array<microsoft_graph_accessPackageResource> | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageResourceRole = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  originId?: (string | null) | undefined;
  originSystem?: (string | null) | undefined;
  resource?:
    | (
        | (microsoft_graph_accessPackageResource | {})
        | Array<microsoft_graph_accessPackageResource | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_accessPackageResourceScope = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isRootScope?: (boolean | null) | undefined;
  originId?: (string | null) | undefined;
  originSystem?: (string | null) | undefined;
  resource?:
    | (
        | (microsoft_graph_accessPackageResource | {})
        | Array<microsoft_graph_accessPackageResource | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_activityHistoryItem = microsoft_graph_entity & {
  activeDurationSeconds?: (number | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  expirationDateTime?: (string | null) | undefined;
  lastActiveDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  startedDateTime?: string | undefined;
  status?: ((microsoft_graph_status | {}) | Array<microsoft_graph_status | {}>) | undefined;
  userTimezone?: (string | null) | undefined;
  activity?: microsoft_graph_userActivity | undefined;
  '@odata.type': string;
};
type microsoft_graph_associatedTeamInfo = microsoft_graph_teamInfo & {
  '@odata.type': string;
};
type microsoft_graph_baseItem = microsoft_graph_entity & {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: string | undefined;
  description?: (string | null) | undefined;
  eTag?: (string | null) | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: string | undefined;
  name?: (string | null) | undefined;
  parentReference?:
    | ((microsoft_graph_itemReference | {}) | Array<microsoft_graph_itemReference | {}>)
    | undefined;
  webUrl?: (string | null) | undefined;
  createdByUser?: ((microsoft_graph_user | {}) | Array<microsoft_graph_user | {}>) | undefined;
  lastModifiedByUser?: ((microsoft_graph_user | {}) | Array<microsoft_graph_user | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_baseSitePage = microsoft_graph_baseItem & {
  pageLayout?:
    | ((microsoft_graph_pageLayoutType | {}) | Array<microsoft_graph_pageLayoutType | {}>)
    | undefined;
  publishingState?:
    | ((microsoft_graph_publicationFacet | {}) | Array<microsoft_graph_publicationFacet | {}>)
    | undefined;
  title?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_calendar = microsoft_graph_entity & {
  allowedOnlineMeetingProviders?:
    | Array<
        | (microsoft_graph_onlineMeetingProviderType | {})
        | Array<microsoft_graph_onlineMeetingProviderType | {}>
      >
    | undefined;
  canEdit?: (boolean | null) | undefined;
  canShare?: (boolean | null) | undefined;
  canViewPrivateItems?: (boolean | null) | undefined;
  changeKey?: (string | null) | undefined;
  color?:
    | ((microsoft_graph_calendarColor | {}) | Array<microsoft_graph_calendarColor | {}>)
    | undefined;
  defaultOnlineMeetingProvider?:
    | (
        | (microsoft_graph_onlineMeetingProviderType | {})
        | Array<microsoft_graph_onlineMeetingProviderType | {}>
      )
    | undefined;
  hexColor?: (string | null) | undefined;
  isDefaultCalendar?: (boolean | null) | undefined;
  isRemovable?: (boolean | null) | undefined;
  isTallyingResponses?: (boolean | null) | undefined;
  name?: (string | null) | undefined;
  owner?:
    | ((microsoft_graph_emailAddress | {}) | Array<microsoft_graph_emailAddress | {}>)
    | undefined;
  calendarPermissions?: Array<microsoft_graph_calendarPermission> | undefined;
  calendarView?: Array<microsoft_graph_event> | undefined;
  events?: Array<microsoft_graph_event> | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_channel = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: string | undefined;
  email?: (string | null) | undefined;
  isArchived?: (boolean | null) | undefined;
  isFavoriteByDefault?: (boolean | null) | undefined;
  membershipType?:
    | (
        | (microsoft_graph_channelMembershipType | {})
        | Array<microsoft_graph_channelMembershipType | {}>
      )
    | undefined;
  summary?:
    | ((microsoft_graph_channelSummary | {}) | Array<microsoft_graph_channelSummary | {}>)
    | undefined;
  tenantId?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  allMembers?: Array<microsoft_graph_conversationMember> | undefined;
  filesFolder?:
    | ((microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>)
    | undefined;
  members?: Array<microsoft_graph_conversationMember> | undefined;
  messages?: Array<microsoft_graph_chatMessage> | undefined;
  sharedWithTeams?: Array<microsoft_graph_sharedWithChannelTeamInfo> | undefined;
  tabs?: Array<microsoft_graph_teamsTab> | undefined;
  '@odata.type': string;
};
type microsoft_graph_chatMessage = microsoft_graph_entity & {
  attachments?: Array<microsoft_graph_chatMessageAttachment> | undefined;
  body?: microsoft_graph_itemBody | undefined;
  channelIdentity?:
    | ((microsoft_graph_channelIdentity | {}) | Array<microsoft_graph_channelIdentity | {}>)
    | undefined;
  chatId?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  deletedDateTime?: (string | null) | undefined;
  etag?: (string | null) | undefined;
  eventDetail?:
    | ((microsoft_graph_eventMessageDetail | {}) | Array<microsoft_graph_eventMessageDetail | {}>)
    | undefined;
  from?:
    | (
        | (microsoft_graph_chatMessageFromIdentitySet | {})
        | Array<microsoft_graph_chatMessageFromIdentitySet | {}>
      )
    | undefined;
  importance?: microsoft_graph_chatMessageImportance | undefined;
  lastEditedDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  locale?: string | undefined;
  mentions?: Array<microsoft_graph_chatMessageMention> | undefined;
  messageHistory?: Array<microsoft_graph_chatMessageHistoryItem> | undefined;
  messageType?: microsoft_graph_chatMessageType | undefined;
  policyViolation?:
    | (
        | (microsoft_graph_chatMessagePolicyViolation | {})
        | Array<microsoft_graph_chatMessagePolicyViolation | {}>
      )
    | undefined;
  reactions?: Array<microsoft_graph_chatMessageReaction> | undefined;
  replyToId?: (string | null) | undefined;
  subject?: (string | null) | undefined;
  summary?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  hostedContents?: Array<microsoft_graph_chatMessageHostedContent> | undefined;
  replies?: Array<microsoft_graph_chatMessage> | undefined;
  '@odata.type': string;
};
type microsoft_graph_columnDefinition = microsoft_graph_entity & {
  boolean?:
    | ((microsoft_graph_booleanColumn | {}) | Array<microsoft_graph_booleanColumn | {}>)
    | undefined;
  calculated?:
    | ((microsoft_graph_calculatedColumn | {}) | Array<microsoft_graph_calculatedColumn | {}>)
    | undefined;
  choice?:
    | ((microsoft_graph_choiceColumn | {}) | Array<microsoft_graph_choiceColumn | {}>)
    | undefined;
  columnGroup?: (string | null) | undefined;
  contentApprovalStatus?:
    | (
        | (microsoft_graph_contentApprovalStatusColumn | {})
        | Array<microsoft_graph_contentApprovalStatusColumn | {}>
      )
    | undefined;
  currency?:
    | ((microsoft_graph_currencyColumn | {}) | Array<microsoft_graph_currencyColumn | {}>)
    | undefined;
  dateTime?:
    | ((microsoft_graph_dateTimeColumn | {}) | Array<microsoft_graph_dateTimeColumn | {}>)
    | undefined;
  defaultValue?:
    | ((microsoft_graph_defaultColumnValue | {}) | Array<microsoft_graph_defaultColumnValue | {}>)
    | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  enforceUniqueValues?: (boolean | null) | undefined;
  geolocation?:
    | ((microsoft_graph_geolocationColumn | {}) | Array<microsoft_graph_geolocationColumn | {}>)
    | undefined;
  hidden?: (boolean | null) | undefined;
  hyperlinkOrPicture?:
    | (
        | (microsoft_graph_hyperlinkOrPictureColumn | {})
        | Array<microsoft_graph_hyperlinkOrPictureColumn | {}>
      )
    | undefined;
  indexed?: (boolean | null) | undefined;
  isDeletable?: (boolean | null) | undefined;
  isReorderable?: (boolean | null) | undefined;
  isSealed?: (boolean | null) | undefined;
  lookup?:
    | ((microsoft_graph_lookupColumn | {}) | Array<microsoft_graph_lookupColumn | {}>)
    | undefined;
  name?: (string | null) | undefined;
  number?:
    | ((microsoft_graph_numberColumn | {}) | Array<microsoft_graph_numberColumn | {}>)
    | undefined;
  personOrGroup?:
    | ((microsoft_graph_personOrGroupColumn | {}) | Array<microsoft_graph_personOrGroupColumn | {}>)
    | undefined;
  propagateChanges?: (boolean | null) | undefined;
  readOnly?: (boolean | null) | undefined;
  required?: (boolean | null) | undefined;
  sourceContentType?:
    | ((microsoft_graph_contentTypeInfo | {}) | Array<microsoft_graph_contentTypeInfo | {}>)
    | undefined;
  term?: ((microsoft_graph_termColumn | {}) | Array<microsoft_graph_termColumn | {}>) | undefined;
  text?: ((microsoft_graph_textColumn | {}) | Array<microsoft_graph_textColumn | {}>) | undefined;
  thumbnail?:
    | ((microsoft_graph_thumbnailColumn | {}) | Array<microsoft_graph_thumbnailColumn | {}>)
    | undefined;
  type?: ((microsoft_graph_columnTypes | {}) | Array<microsoft_graph_columnTypes | {}>) | undefined;
  validation?:
    | ((microsoft_graph_columnValidation | {}) | Array<microsoft_graph_columnValidation | {}>)
    | undefined;
  sourceColumn?:
    | ((microsoft_graph_columnDefinition | {}) | Array<microsoft_graph_columnDefinition | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_contactFolder = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  parentFolderId?: (string | null) | undefined;
  childFolders?: Array<microsoft_graph_contactFolder> | undefined;
  contacts?: Array<microsoft_graph_contact> | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_contentType = microsoft_graph_entity & {
  associatedHubsUrls?: Array<string | null> | undefined;
  description?: (string | null) | undefined;
  documentSet?:
    | ((microsoft_graph_documentSet | {}) | Array<microsoft_graph_documentSet | {}>)
    | undefined;
  documentTemplate?:
    | ((microsoft_graph_documentSetContent | {}) | Array<microsoft_graph_documentSetContent | {}>)
    | undefined;
  group?: (string | null) | undefined;
  hidden?: (boolean | null) | undefined;
  inheritedFrom?:
    | ((microsoft_graph_itemReference | {}) | Array<microsoft_graph_itemReference | {}>)
    | undefined;
  isBuiltIn?: (boolean | null) | undefined;
  name?: (string | null) | undefined;
  order?:
    | ((microsoft_graph_contentTypeOrder | {}) | Array<microsoft_graph_contentTypeOrder | {}>)
    | undefined;
  parentId?: (string | null) | undefined;
  propagateChanges?: (boolean | null) | undefined;
  readOnly?: (boolean | null) | undefined;
  sealed?: (boolean | null) | undefined;
  base?: ((microsoft_graph_contentType | {}) | Array<microsoft_graph_contentType | {}>) | undefined;
  baseTypes?: Array<microsoft_graph_contentType> | undefined;
  columnLinks?: Array<microsoft_graph_columnLink> | undefined;
  columnPositions?: Array<microsoft_graph_columnDefinition> | undefined;
  columns?: Array<microsoft_graph_columnDefinition> | undefined;
  '@odata.type': string;
};
type microsoft_graph_domain = microsoft_graph_entity & {
  authenticationType?: string | undefined;
  availabilityStatus?: (string | null) | undefined;
  isAdminManaged?: boolean | undefined;
  isDefault?: boolean | undefined;
  isInitial?: boolean | undefined;
  isRoot?: boolean | undefined;
  isVerified?: boolean | undefined;
  manufacturer?: (string | null) | undefined;
  model?: (string | null) | undefined;
  passwordNotificationWindowInDays?: (number | null) | undefined;
  passwordValidityPeriodInDays?: (number | null) | undefined;
  state?:
    | ((microsoft_graph_domainState | {}) | Array<microsoft_graph_domainState | {}>)
    | undefined;
  supportedServices?: Array<string> | undefined;
  domainNameReferences?: Array<microsoft_graph_directoryObject> | undefined;
  federationConfiguration?: Array<microsoft_graph_internalDomainFederation> | undefined;
  rootDomain?: ((microsoft_graph_domain | {}) | Array<microsoft_graph_domain | {}>) | undefined;
  serviceConfigurationRecords?: Array<microsoft_graph_domainDnsRecord> | undefined;
  verificationDnsRecords?: Array<microsoft_graph_domainDnsRecord> | undefined;
  '@odata.type': string;
};
type microsoft_graph_domainState = {
  lastActionDateTime?: (string | null) | undefined;
  operation?: (string | null) | undefined;
  status?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_internalDomainFederation = microsoft_graph_samlOrWsFedProvider & {
  activeSignInUri?: (string | null) | undefined;
  federatedIdpMfaBehavior?:
    | (
        | (microsoft_graph_federatedIdpMfaBehavior | {})
        | Array<microsoft_graph_federatedIdpMfaBehavior | {}>
      )
    | undefined;
  isSignedAuthenticationRequestRequired?: (boolean | null) | undefined;
  nextSigningCertificate?: (string | null) | undefined;
  passwordResetUri?: (string | null) | undefined;
  promptLoginBehavior?:
    | ((microsoft_graph_promptLoginBehavior | {}) | Array<microsoft_graph_promptLoginBehavior | {}>)
    | undefined;
  signingCertificateUpdateStatus?:
    | (
        | (microsoft_graph_signingCertificateUpdateStatus | {})
        | Array<microsoft_graph_signingCertificateUpdateStatus | {}>
      )
    | undefined;
  signOutUri?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_samlOrWsFedProvider = microsoft_graph_identityProviderBase & {
  issuerUri?: (string | null) | undefined;
  metadataExchangeUri?: (string | null) | undefined;
  passiveSignInUri?: (string | null) | undefined;
  preferredAuthenticationProtocol?:
    | (
        | (microsoft_graph_authenticationProtocol | {})
        | Array<microsoft_graph_authenticationProtocol | {}>
      )
    | undefined;
  signingCertificate?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_identityProviderBase = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_signingCertificateUpdateStatus = {
  certificateUpdateResult?: (string | null) | undefined;
  lastRunDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_domainDnsRecord = microsoft_graph_entity & {
  isOptional?: boolean | undefined;
  label?: string | undefined;
  recordType?: (string | null) | undefined;
  supportedService?: string | undefined;
  ttl?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_drive = microsoft_graph_baseItem & {
  driveType?: (string | null) | undefined;
  owner?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  quota?: ((microsoft_graph_quota | {}) | Array<microsoft_graph_quota | {}>) | undefined;
  sharePointIds?:
    | ((microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>)
    | undefined;
  system?:
    | ((microsoft_graph_systemFacet | {}) | Array<microsoft_graph_systemFacet | {}>)
    | undefined;
  bundles?: Array<microsoft_graph_driveItem> | undefined;
  following?: Array<microsoft_graph_driveItem> | undefined;
  items?: Array<microsoft_graph_driveItem> | undefined;
  list?: ((microsoft_graph_list | {}) | Array<microsoft_graph_list | {}>) | undefined;
  root?: ((microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>) | undefined;
  special?: Array<microsoft_graph_driveItem> | undefined;
  '@odata.type': string;
};
type microsoft_graph_driveItem = microsoft_graph_baseItem & {
  audio?: ((microsoft_graph_audio | {}) | Array<microsoft_graph_audio | {}>) | undefined;
  bundle?: ((microsoft_graph_bundle | {}) | Array<microsoft_graph_bundle | {}>) | undefined;
  content?: (string | null) | undefined;
  cTag?: (string | null) | undefined;
  deleted?: ((microsoft_graph_deleted | {}) | Array<microsoft_graph_deleted | {}>) | undefined;
  file?: ((microsoft_graph_file | {}) | Array<microsoft_graph_file | {}>) | undefined;
  fileSystemInfo?:
    | ((microsoft_graph_fileSystemInfo | {}) | Array<microsoft_graph_fileSystemInfo | {}>)
    | undefined;
  folder?: ((microsoft_graph_folder | {}) | Array<microsoft_graph_folder | {}>) | undefined;
  image?: ((microsoft_graph_image | {}) | Array<microsoft_graph_image | {}>) | undefined;
  location?:
    | ((microsoft_graph_geoCoordinates | {}) | Array<microsoft_graph_geoCoordinates | {}>)
    | undefined;
  malware?: ((microsoft_graph_malware | {}) | Array<microsoft_graph_malware | {}>) | undefined;
  package?: ((microsoft_graph_package | {}) | Array<microsoft_graph_package | {}>) | undefined;
  pendingOperations?:
    | ((microsoft_graph_pendingOperations | {}) | Array<microsoft_graph_pendingOperations | {}>)
    | undefined;
  photo?: ((microsoft_graph_photo | {}) | Array<microsoft_graph_photo | {}>) | undefined;
  publication?:
    | ((microsoft_graph_publicationFacet | {}) | Array<microsoft_graph_publicationFacet | {}>)
    | undefined;
  remoteItem?:
    | ((microsoft_graph_remoteItem | {}) | Array<microsoft_graph_remoteItem | {}>)
    | undefined;
  root?: ((microsoft_graph_root | {}) | Array<microsoft_graph_root | {}>) | undefined;
  searchResult?:
    | ((microsoft_graph_searchResult | {}) | Array<microsoft_graph_searchResult | {}>)
    | undefined;
  shared?: ((microsoft_graph_shared | {}) | Array<microsoft_graph_shared | {}>) | undefined;
  sharepointIds?:
    | ((microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>)
    | undefined;
  size?: (number | null) | undefined;
  specialFolder?:
    | ((microsoft_graph_specialFolder | {}) | Array<microsoft_graph_specialFolder | {}>)
    | undefined;
  video?: ((microsoft_graph_video | {}) | Array<microsoft_graph_video | {}>) | undefined;
  webDavUrl?: (string | null) | undefined;
  analytics?:
    | ((microsoft_graph_itemAnalytics | {}) | Array<microsoft_graph_itemAnalytics | {}>)
    | undefined;
  children?: Array<microsoft_graph_driveItem> | undefined;
  listItem?: ((microsoft_graph_listItem | {}) | Array<microsoft_graph_listItem | {}>) | undefined;
  permissions?: Array<microsoft_graph_permission> | undefined;
  retentionLabel?:
    | ((microsoft_graph_itemRetentionLabel | {}) | Array<microsoft_graph_itemRetentionLabel | {}>)
    | undefined;
  subscriptions?: Array<microsoft_graph_subscription> | undefined;
  thumbnails?: Array<microsoft_graph_thumbnailSet> | undefined;
  versions?: Array<microsoft_graph_driveItemVersion> | undefined;
  workbook?: ((microsoft_graph_workbook | {}) | Array<microsoft_graph_workbook | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationClass = microsoft_graph_entity & {
  classCode?: (string | null) | undefined;
  course?:
    | ((microsoft_graph_educationCourse | {}) | Array<microsoft_graph_educationCourse | {}>)
    | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  description?: (string | null) | undefined;
  displayName?: string | undefined;
  externalId?: (string | null) | undefined;
  externalName?: (string | null) | undefined;
  externalSource?:
    | (
        | (microsoft_graph_educationExternalSource | {})
        | Array<microsoft_graph_educationExternalSource | {}>
      )
    | undefined;
  externalSourceDetail?: (string | null) | undefined;
  grade?: (string | null) | undefined;
  mailNickname?: string | undefined;
  term?:
    | ((microsoft_graph_educationTerm | {}) | Array<microsoft_graph_educationTerm | {}>)
    | undefined;
  assignmentCategories?: Array<microsoft_graph_educationCategory> | undefined;
  assignmentDefaults?:
    | (
        | (microsoft_graph_educationAssignmentDefaults | {})
        | Array<microsoft_graph_educationAssignmentDefaults | {}>
      )
    | undefined;
  assignments?: Array<microsoft_graph_educationAssignment> | undefined;
  assignmentSettings?:
    | (
        | (microsoft_graph_educationAssignmentSettings | {})
        | Array<microsoft_graph_educationAssignmentSettings | {}>
      )
    | undefined;
  group?: ((microsoft_graph_group | {}) | Array<microsoft_graph_group | {}>) | undefined;
  members?: Array<microsoft_graph_educationUser> | undefined;
  modules?: Array<microsoft_graph_educationModule> | undefined;
  schools?: Array<microsoft_graph_educationSchool> | undefined;
  teachers?: Array<microsoft_graph_educationUser> | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationCourse = {
  courseNumber?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  externalId?: (string | null) | undefined;
  subject?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationExternalSource = 'sis' | 'manual' | 'unknownFutureValue';
type microsoft_graph_educationTerm = {
  displayName?: (string | null) | undefined;
  endDate?: (string | null) | undefined;
  externalId?: (string | null) | undefined;
  startDate?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationCategory = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationAssignmentDefaults = microsoft_graph_entity & {
  addedStudentAction?:
    | (
        | (microsoft_graph_educationAddedStudentAction | {})
        | Array<microsoft_graph_educationAddedStudentAction | {}>
      )
    | undefined;
  addToCalendarAction?:
    | (
        | (microsoft_graph_educationAddToCalendarOptions | {})
        | Array<microsoft_graph_educationAddToCalendarOptions | {}>
      )
    | undefined;
  dueTime?: (string | null) | undefined;
  notificationChannelUrl?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationAddedStudentAction = 'none' | 'assignIfOpen' | 'unknownFutureValue';
type microsoft_graph_educationAddToCalendarOptions =
  | 'none'
  | 'studentsAndPublisher'
  | 'studentsAndTeamOwners'
  | 'unknownFutureValue'
  | 'studentsOnly';
type microsoft_graph_educationAssignment = microsoft_graph_entity & {
  addedStudentAction?:
    | (
        | (microsoft_graph_educationAddedStudentAction | {})
        | Array<microsoft_graph_educationAddedStudentAction | {}>
      )
    | undefined;
  addToCalendarAction?:
    | (
        | (microsoft_graph_educationAddToCalendarOptions | {})
        | Array<microsoft_graph_educationAddToCalendarOptions | {}>
      )
    | undefined;
  allowLateSubmissions?: (boolean | null) | undefined;
  allowStudentsToAddResourcesToSubmission?: (boolean | null) | undefined;
  assignDateTime?: (string | null) | undefined;
  assignedDateTime?: (string | null) | undefined;
  assignTo?:
    | (
        | (microsoft_graph_educationAssignmentRecipient | {})
        | Array<microsoft_graph_educationAssignmentRecipient | {}>
      )
    | undefined;
  classId?: (string | null) | undefined;
  closeDateTime?: (string | null) | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  dueDateTime?: (string | null) | undefined;
  feedbackResourcesFolderUrl?: (string | null) | undefined;
  grading?:
    | (
        | (microsoft_graph_educationAssignmentGradeType | {})
        | Array<microsoft_graph_educationAssignmentGradeType | {}>
      )
    | undefined;
  instructions?:
    | ((microsoft_graph_educationItemBody | {}) | Array<microsoft_graph_educationItemBody | {}>)
    | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  moduleUrl?: (string | null) | undefined;
  notificationChannelUrl?: (string | null) | undefined;
  resourcesFolderUrl?: (string | null) | undefined;
  status?:
    | (
        | (microsoft_graph_educationAssignmentStatus | {})
        | Array<microsoft_graph_educationAssignmentStatus | {}>
      )
    | undefined;
  webUrl?: (string | null) | undefined;
  categories?: Array<microsoft_graph_educationCategory> | undefined;
  gradingCategory?:
    | (
        | (microsoft_graph_educationGradingCategory | {})
        | Array<microsoft_graph_educationGradingCategory | {}>
      )
    | undefined;
  resources?: Array<microsoft_graph_educationAssignmentResource> | undefined;
  rubric?:
    | ((microsoft_graph_educationRubric | {}) | Array<microsoft_graph_educationRubric | {}>)
    | undefined;
  submissions?: Array<microsoft_graph_educationSubmission> | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationAssignmentRecipient = {
  '@odata.type': string;
};
type microsoft_graph_educationAssignmentGradeType = {
  '@odata.type': string;
};
type microsoft_graph_educationItemBody = {
  content?: (string | null) | undefined;
  contentType?:
    | ((microsoft_graph_bodyType | {}) | Array<microsoft_graph_bodyType | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationAssignmentStatus =
  | 'draft'
  | 'published'
  | 'assigned'
  | 'unknownFutureValue'
  | 'inactive';
type microsoft_graph_educationGradingCategory = microsoft_graph_entity & {
  displayName?: string | undefined;
  percentageWeight?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationAssignmentResource = microsoft_graph_entity & {
  distributeForStudentWork?: (boolean | null) | undefined;
  resource?:
    | ((microsoft_graph_educationResource | {}) | Array<microsoft_graph_educationResource | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationResource = {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationRubric = microsoft_graph_entity & {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  description?:
    | ((microsoft_graph_educationItemBody | {}) | Array<microsoft_graph_educationItemBody | {}>)
    | undefined;
  displayName?: (string | null) | undefined;
  grading?:
    | (
        | (microsoft_graph_educationAssignmentGradeType | {})
        | Array<microsoft_graph_educationAssignmentGradeType | {}>
      )
    | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  levels?: Array<microsoft_graph_rubricLevel> | undefined;
  qualities?: Array<microsoft_graph_rubricQuality> | undefined;
  '@odata.type': string;
};
type microsoft_graph_rubricLevel = {
  description?:
    | ((microsoft_graph_educationItemBody | {}) | Array<microsoft_graph_educationItemBody | {}>)
    | undefined;
  displayName?: (string | null) | undefined;
  grading?:
    | (
        | (microsoft_graph_educationAssignmentGradeType | {})
        | Array<microsoft_graph_educationAssignmentGradeType | {}>
      )
    | undefined;
  levelId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_rubricQuality = {
  criteria?: Array<microsoft_graph_rubricCriterion> | undefined;
  description?:
    | ((microsoft_graph_educationItemBody | {}) | Array<microsoft_graph_educationItemBody | {}>)
    | undefined;
  displayName?: (string | null) | undefined;
  qualityId?: (string | null) | undefined;
  weight?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  '@odata.type': string;
};
type microsoft_graph_rubricCriterion = {
  description?:
    | ((microsoft_graph_educationItemBody | {}) | Array<microsoft_graph_educationItemBody | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationSubmission = microsoft_graph_entity & {
  assignmentId?: (string | null) | undefined;
  excusedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  excusedDateTime?: (string | null) | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  reassignedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  reassignedDateTime?: (string | null) | undefined;
  recipient?:
    | (
        | (microsoft_graph_educationSubmissionRecipient | {})
        | Array<microsoft_graph_educationSubmissionRecipient | {}>
      )
    | undefined;
  resourcesFolderUrl?: (string | null) | undefined;
  returnedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  returnedDateTime?: (string | null) | undefined;
  status?:
    | (
        | (microsoft_graph_educationSubmissionStatus | {})
        | Array<microsoft_graph_educationSubmissionStatus | {}>
      )
    | undefined;
  submittedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  submittedDateTime?: (string | null) | undefined;
  unsubmittedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  unsubmittedDateTime?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  outcomes?: Array<microsoft_graph_educationOutcome> | undefined;
  resources?: Array<microsoft_graph_educationSubmissionResource> | undefined;
  submittedResources?: Array<microsoft_graph_educationSubmissionResource> | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationSubmissionRecipient = {
  '@odata.type': string;
};
type microsoft_graph_educationSubmissionStatus =
  | 'working'
  | 'submitted'
  | 'released'
  | 'returned'
  | 'unknownFutureValue'
  | 'reassigned'
  | 'excused';
type microsoft_graph_educationOutcome = microsoft_graph_entity & {
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationSubmissionResource = microsoft_graph_entity & {
  assignmentResourceUrl?: (string | null) | undefined;
  resource?:
    | ((microsoft_graph_educationResource | {}) | Array<microsoft_graph_educationResource | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationAssignmentSettings = microsoft_graph_entity & {
  submissionAnimationDisabled?: (boolean | null) | undefined;
  gradingCategories?: Array<microsoft_graph_educationGradingCategory> | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationOnPremisesInfo = {
  immutableId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationUserRole = 'student' | 'teacher' | 'none' | 'unknownFutureValue';
type microsoft_graph_relatedContact = {
  accessConsent?: (boolean | null) | undefined;
  displayName?: string | undefined;
  emailAddress?: string | undefined;
  mobilePhone?: (string | null) | undefined;
  relationship?: microsoft_graph_contactRelationship | undefined;
  '@odata.type': string;
};
type microsoft_graph_contactRelationship =
  | 'parent'
  | 'relative'
  | 'aide'
  | 'doctor'
  | 'guardian'
  | 'child'
  | 'other'
  | 'unknownFutureValue';
type microsoft_graph_educationStudent = {
  birthDate?: (string | null) | undefined;
  externalId?: (string | null) | undefined;
  gender?:
    | ((microsoft_graph_educationGender | {}) | Array<microsoft_graph_educationGender | {}>)
    | undefined;
  grade?: (string | null) | undefined;
  graduationYear?: (string | null) | undefined;
  studentNumber?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationGender = 'female' | 'male' | 'other' | 'unknownFutureValue';
type microsoft_graph_educationTeacher = {
  externalId?: (string | null) | undefined;
  teacherNumber?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationOrganization = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: string | undefined;
  externalSource?:
    | (
        | (microsoft_graph_educationExternalSource | {})
        | Array<microsoft_graph_educationExternalSource | {}>
      )
    | undefined;
  externalSourceDetail?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_administrativeUnit = microsoft_graph_directoryObject & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isMemberManagementRestricted?: (boolean | null) | undefined;
  membershipRule?: (string | null) | undefined;
  membershipRuleProcessingState?: (string | null) | undefined;
  membershipType?: (string | null) | undefined;
  visibility?: (string | null) | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  members?: Array<microsoft_graph_directoryObject> | undefined;
  scopedRoleMembers?: Array<microsoft_graph_scopedRoleMembership> | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationModule = microsoft_graph_entity & {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isPinned?: (boolean | null) | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  resourcesFolderUrl?: (string | null) | undefined;
  status?:
    | (
        | (microsoft_graph_educationModuleStatus | {})
        | Array<microsoft_graph_educationModuleStatus | {}>
      )
    | undefined;
  resources?: Array<microsoft_graph_educationModuleResource> | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationModuleStatus = 'draft' | 'published' | 'unknownFutureValue';
type microsoft_graph_educationModuleResource = microsoft_graph_entity & {
  resource?:
    | ((microsoft_graph_educationResource | {}) | Array<microsoft_graph_educationResource | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationSchool = microsoft_graph_educationOrganization & {
  address?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  externalId?: (string | null) | undefined;
  externalPrincipalId?: (string | null) | undefined;
  fax?: (string | null) | undefined;
  highestGrade?: (string | null) | undefined;
  lowestGrade?: (string | null) | undefined;
  phone?: (string | null) | undefined;
  principalEmail?: (string | null) | undefined;
  principalName?: (string | null) | undefined;
  schoolNumber?: (string | null) | undefined;
  administrativeUnit?:
    | ((microsoft_graph_administrativeUnit | {}) | Array<microsoft_graph_administrativeUnit | {}>)
    | undefined;
  classes?: Array<microsoft_graph_educationClass> | undefined;
  users?: Array<microsoft_graph_educationUser> | undefined;
  '@odata.type': string;
};
type microsoft_graph_educationUser = microsoft_graph_entity & {
  accountEnabled?: (boolean | null) | undefined;
  assignedLicenses?: Array<microsoft_graph_assignedLicense> | undefined;
  assignedPlans?: Array<microsoft_graph_assignedPlan> | undefined;
  businessPhones?: Array<string> | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  department?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  externalSource?:
    | (
        | (microsoft_graph_educationExternalSource | {})
        | Array<microsoft_graph_educationExternalSource | {}>
      )
    | undefined;
  externalSourceDetail?: (string | null) | undefined;
  givenName?: (string | null) | undefined;
  mail?: (string | null) | undefined;
  mailingAddress?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  mailNickname?: (string | null) | undefined;
  middleName?: (string | null) | undefined;
  mobilePhone?: (string | null) | undefined;
  officeLocation?: (string | null) | undefined;
  onPremisesInfo?:
    | (
        | (microsoft_graph_educationOnPremisesInfo | {})
        | Array<microsoft_graph_educationOnPremisesInfo | {}>
      )
    | undefined;
  passwordPolicies?: (string | null) | undefined;
  passwordProfile?:
    | ((microsoft_graph_passwordProfile | {}) | Array<microsoft_graph_passwordProfile | {}>)
    | undefined;
  preferredLanguage?: (string | null) | undefined;
  primaryRole?: microsoft_graph_educationUserRole | undefined;
  provisionedPlans?: Array<microsoft_graph_provisionedPlan> | undefined;
  refreshTokensValidFromDateTime?: (string | null) | undefined;
  relatedContacts?: Array<microsoft_graph_relatedContact> | undefined;
  residenceAddress?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  showInAddressList?: (boolean | null) | undefined;
  student?:
    | ((microsoft_graph_educationStudent | {}) | Array<microsoft_graph_educationStudent | {}>)
    | undefined;
  surname?: (string | null) | undefined;
  teacher?:
    | ((microsoft_graph_educationTeacher | {}) | Array<microsoft_graph_educationTeacher | {}>)
    | undefined;
  usageLocation?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  userType?: (string | null) | undefined;
  assignments?: Array<microsoft_graph_educationAssignment> | undefined;
  classes?: Array<microsoft_graph_educationClass> | undefined;
  rubrics?: Array<microsoft_graph_educationRubric> | undefined;
  schools?: Array<microsoft_graph_educationSchool> | undefined;
  taughtClasses?: Array<microsoft_graph_educationClass> | undefined;
  user?: ((microsoft_graph_user | {}) | Array<microsoft_graph_user | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_event = microsoft_graph_outlookItem & {
  allowNewTimeProposals?: (boolean | null) | undefined;
  attendees?: Array<microsoft_graph_attendee> | undefined;
  body?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  bodyPreview?: (string | null) | undefined;
  cancelledOccurrences?: Array<string> | undefined;
  end?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  hasAttachments?: (boolean | null) | undefined;
  hideAttendees?: (boolean | null) | undefined;
  iCalUId?: (string | null) | undefined;
  importance?:
    | ((microsoft_graph_importance | {}) | Array<microsoft_graph_importance | {}>)
    | undefined;
  isAllDay?: (boolean | null) | undefined;
  isCancelled?: (boolean | null) | undefined;
  isDraft?: (boolean | null) | undefined;
  isOnlineMeeting?: (boolean | null) | undefined;
  isOrganizer?: (boolean | null) | undefined;
  isReminderOn?: (boolean | null) | undefined;
  location?: ((microsoft_graph_location | {}) | Array<microsoft_graph_location | {}>) | undefined;
  locations?: Array<microsoft_graph_location> | undefined;
  onlineMeeting?:
    | ((microsoft_graph_onlineMeetingInfo | {}) | Array<microsoft_graph_onlineMeetingInfo | {}>)
    | undefined;
  onlineMeetingProvider?:
    | (
        | (microsoft_graph_onlineMeetingProviderType | {})
        | Array<microsoft_graph_onlineMeetingProviderType | {}>
      )
    | undefined;
  onlineMeetingUrl?: (string | null) | undefined;
  organizer?:
    | ((microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>)
    | undefined;
  originalEndTimeZone?: (string | null) | undefined;
  originalStart?: (string | null) | undefined;
  originalStartTimeZone?: (string | null) | undefined;
  recurrence?:
    | ((microsoft_graph_patternedRecurrence | {}) | Array<microsoft_graph_patternedRecurrence | {}>)
    | undefined;
  reminderMinutesBeforeStart?: (number | null) | undefined;
  responseRequested?: (boolean | null) | undefined;
  responseStatus?:
    | ((microsoft_graph_responseStatus | {}) | Array<microsoft_graph_responseStatus | {}>)
    | undefined;
  sensitivity?:
    | ((microsoft_graph_sensitivity | {}) | Array<microsoft_graph_sensitivity | {}>)
    | undefined;
  seriesMasterId?: (string | null) | undefined;
  showAs?:
    | ((microsoft_graph_freeBusyStatus | {}) | Array<microsoft_graph_freeBusyStatus | {}>)
    | undefined;
  start?:
    | ((microsoft_graph_dateTimeTimeZone | {}) | Array<microsoft_graph_dateTimeTimeZone | {}>)
    | undefined;
  subject?: (string | null) | undefined;
  transactionId?: (string | null) | undefined;
  type?: ((microsoft_graph_eventType | {}) | Array<microsoft_graph_eventType | {}>) | undefined;
  webLink?: (string | null) | undefined;
  attachments?: Array<microsoft_graph_attachment> | undefined;
  calendar?: ((microsoft_graph_calendar | {}) | Array<microsoft_graph_calendar | {}>) | undefined;
  exceptionOccurrences?: Array<microsoft_graph_event> | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  instances?: Array<microsoft_graph_event> | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_group = microsoft_graph_directoryObject & {
  allowExternalSenders?: (boolean | null) | undefined;
  assignedLabels?: Array<microsoft_graph_assignedLabel> | undefined;
  assignedLicenses?: Array<microsoft_graph_assignedLicense> | undefined;
  autoSubscribeNewMembers?: (boolean | null) | undefined;
  classification?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  expirationDateTime?: (string | null) | undefined;
  groupTypes?: Array<string> | undefined;
  hasMembersWithLicenseErrors?: (boolean | null) | undefined;
  hideFromAddressLists?: (boolean | null) | undefined;
  hideFromOutlookClients?: (boolean | null) | undefined;
  isArchived?: (boolean | null) | undefined;
  isAssignableToRole?: (boolean | null) | undefined;
  isManagementRestricted?: (boolean | null) | undefined;
  isSubscribedByMail?: (boolean | null) | undefined;
  licenseProcessingState?:
    | (
        | (microsoft_graph_licenseProcessingState | {})
        | Array<microsoft_graph_licenseProcessingState | {}>
      )
    | undefined;
  mail?: (string | null) | undefined;
  mailEnabled?: (boolean | null) | undefined;
  mailNickname?: (string | null) | undefined;
  membershipRule?: (string | null) | undefined;
  membershipRuleProcessingState?: (string | null) | undefined;
  onPremisesDomainName?: (string | null) | undefined;
  onPremisesLastSyncDateTime?: (string | null) | undefined;
  onPremisesNetBiosName?: (string | null) | undefined;
  onPremisesProvisioningErrors?: Array<microsoft_graph_onPremisesProvisioningError> | undefined;
  onPremisesSamAccountName?: (string | null) | undefined;
  onPremisesSecurityIdentifier?: (string | null) | undefined;
  onPremisesSyncEnabled?: (boolean | null) | undefined;
  preferredDataLocation?: (string | null) | undefined;
  preferredLanguage?: (string | null) | undefined;
  proxyAddresses?: Array<string> | undefined;
  renewedDateTime?: (string | null) | undefined;
  securityEnabled?: (boolean | null) | undefined;
  securityIdentifier?: (string | null) | undefined;
  serviceProvisioningErrors?: Array<microsoft_graph_serviceProvisioningError> | undefined;
  theme?: (string | null) | undefined;
  uniqueName?: (string | null) | undefined;
  unseenCount?: (number | null) | undefined;
  visibility?: (string | null) | undefined;
  acceptedSenders?: Array<microsoft_graph_directoryObject> | undefined;
  appRoleAssignments?: Array<microsoft_graph_appRoleAssignment> | undefined;
  calendar?: ((microsoft_graph_calendar | {}) | Array<microsoft_graph_calendar | {}>) | undefined;
  calendarView?: Array<microsoft_graph_event> | undefined;
  conversations?: Array<microsoft_graph_conversation> | undefined;
  createdOnBehalfOf?:
    | ((microsoft_graph_directoryObject | {}) | Array<microsoft_graph_directoryObject | {}>)
    | undefined;
  drive?: ((microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>) | undefined;
  drives?: Array<microsoft_graph_drive> | undefined;
  events?: Array<microsoft_graph_event> | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  groupLifecyclePolicies?: Array<microsoft_graph_groupLifecyclePolicy> | undefined;
  memberOf?: Array<microsoft_graph_directoryObject> | undefined;
  members?: Array<microsoft_graph_directoryObject> | undefined;
  membersWithLicenseErrors?: Array<microsoft_graph_directoryObject> | undefined;
  onenote?: ((microsoft_graph_onenote | {}) | Array<microsoft_graph_onenote | {}>) | undefined;
  owners?: Array<microsoft_graph_directoryObject> | undefined;
  permissionGrants?: Array<microsoft_graph_resourceSpecificPermissionGrant> | undefined;
  photo?:
    | ((microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>)
    | undefined;
  photos?: Array<microsoft_graph_profilePhoto> | undefined;
  planner?:
    | ((microsoft_graph_plannerGroup | {}) | Array<microsoft_graph_plannerGroup | {}>)
    | undefined;
  rejectedSenders?: Array<microsoft_graph_directoryObject> | undefined;
  settings?: Array<microsoft_graph_groupSetting> | undefined;
  sites?: Array<microsoft_graph_site> | undefined;
  team?: ((microsoft_graph_team | {}) | Array<microsoft_graph_team | {}>) | undefined;
  threads?: Array<microsoft_graph_conversationThread> | undefined;
  transitiveMemberOf?: Array<microsoft_graph_directoryObject> | undefined;
  transitiveMembers?: Array<microsoft_graph_directoryObject> | undefined;
  '@odata.type': string;
};
type microsoft_graph_itemActivity = microsoft_graph_entity & {
  access?:
    | ((microsoft_graph_accessAction | {}) | Array<microsoft_graph_accessAction | {}>)
    | undefined;
  activityDateTime?: (string | null) | undefined;
  actor?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  driveItem?:
    | ((microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_itemActivityStat = microsoft_graph_entity & {
  access?:
    | ((microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>)
    | undefined;
  create?:
    | ((microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>)
    | undefined;
  delete?:
    | ((microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>)
    | undefined;
  edit?:
    | ((microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>)
    | undefined;
  endDateTime?: (string | null) | undefined;
  incompleteData?:
    | ((microsoft_graph_incompleteData | {}) | Array<microsoft_graph_incompleteData | {}>)
    | undefined;
  isTrending?: (boolean | null) | undefined;
  move?:
    | ((microsoft_graph_itemActionStat | {}) | Array<microsoft_graph_itemActionStat | {}>)
    | undefined;
  startDateTime?: (string | null) | undefined;
  activities?: Array<microsoft_graph_itemActivity> | undefined;
  '@odata.type': string;
};
type microsoft_graph_itemAnalytics = microsoft_graph_entity & {
  allTime?:
    | ((microsoft_graph_itemActivityStat | {}) | Array<microsoft_graph_itemActivityStat | {}>)
    | undefined;
  itemActivityStats?: Array<microsoft_graph_itemActivityStat> | undefined;
  lastSevenDays?:
    | ((microsoft_graph_itemActivityStat | {}) | Array<microsoft_graph_itemActivityStat | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_list = microsoft_graph_baseItem & {
  displayName?: (string | null) | undefined;
  list?: ((microsoft_graph_listInfo | {}) | Array<microsoft_graph_listInfo | {}>) | undefined;
  sharepointIds?:
    | ((microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>)
    | undefined;
  system?:
    | ((microsoft_graph_systemFacet | {}) | Array<microsoft_graph_systemFacet | {}>)
    | undefined;
  columns?: Array<microsoft_graph_columnDefinition> | undefined;
  contentTypes?: Array<microsoft_graph_contentType> | undefined;
  drive?: ((microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>) | undefined;
  items?: Array<microsoft_graph_listItem> | undefined;
  operations?: Array<microsoft_graph_richLongRunningOperation> | undefined;
  subscriptions?: Array<microsoft_graph_subscription> | undefined;
  '@odata.type': string;
};
type microsoft_graph_listItem = microsoft_graph_baseItem & {
  contentType?:
    | ((microsoft_graph_contentTypeInfo | {}) | Array<microsoft_graph_contentTypeInfo | {}>)
    | undefined;
  sharepointIds?:
    | ((microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>)
    | undefined;
  analytics?:
    | ((microsoft_graph_itemAnalytics | {}) | Array<microsoft_graph_itemAnalytics | {}>)
    | undefined;
  documentSetVersions?: Array<microsoft_graph_documentSetVersion> | undefined;
  driveItem?:
    | ((microsoft_graph_driveItem | {}) | Array<microsoft_graph_driveItem | {}>)
    | undefined;
  fields?:
    | ((microsoft_graph_fieldValueSet | {}) | Array<microsoft_graph_fieldValueSet | {}>)
    | undefined;
  versions?: Array<microsoft_graph_listItemVersion> | undefined;
  '@odata.type': string;
};
type microsoft_graph_mailFolder = microsoft_graph_entity & {
  childFolderCount?: (number | null) | undefined;
  displayName?: (string | null) | undefined;
  isHidden?: (boolean | null) | undefined;
  parentFolderId?: (string | null) | undefined;
  totalItemCount?: (number | null) | undefined;
  unreadItemCount?: (number | null) | undefined;
  childFolders?: Array<microsoft_graph_mailFolder> | undefined;
  messageRules?: Array<microsoft_graph_messageRule> | undefined;
  messages?: Array<microsoft_graph_message> | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_managedDevice = microsoft_graph_entity & {
  activationLockBypassCode?: (string | null) | undefined;
  androidSecurityPatchLevel?: (string | null) | undefined;
  azureADDeviceId?: (string | null) | undefined;
  azureADRegistered?: (boolean | null) | undefined;
  complianceGracePeriodExpirationDateTime?: string | undefined;
  complianceState?: microsoft_graph_complianceState | undefined;
  configurationManagerClientEnabledFeatures?:
    | (
        | (microsoft_graph_configurationManagerClientEnabledFeatures | {})
        | Array<microsoft_graph_configurationManagerClientEnabledFeatures | {}>
      )
    | undefined;
  deviceActionResults?: Array<microsoft_graph_deviceActionResult> | undefined;
  deviceCategoryDisplayName?: (string | null) | undefined;
  deviceEnrollmentType?: microsoft_graph_deviceEnrollmentType | undefined;
  deviceHealthAttestationState?:
    | (
        | (microsoft_graph_deviceHealthAttestationState | {})
        | Array<microsoft_graph_deviceHealthAttestationState | {}>
      )
    | undefined;
  deviceName?: (string | null) | undefined;
  deviceRegistrationState?: microsoft_graph_deviceRegistrationState | undefined;
  easActivated?: boolean | undefined;
  easActivationDateTime?: string | undefined;
  easDeviceId?: (string | null) | undefined;
  emailAddress?: (string | null) | undefined;
  enrolledDateTime?: string | undefined;
  enrollmentProfileName?: (string | null) | undefined;
  ethernetMacAddress?: (string | null) | undefined;
  exchangeAccessState?: microsoft_graph_deviceManagementExchangeAccessState | undefined;
  exchangeAccessStateReason?: microsoft_graph_deviceManagementExchangeAccessStateReason | undefined;
  exchangeLastSuccessfulSyncDateTime?: string | undefined;
  freeStorageSpaceInBytes?: number | undefined;
  iccid?: (string | null) | undefined;
  imei?: (string | null) | undefined;
  isEncrypted?: boolean | undefined;
  isSupervised?: boolean | undefined;
  jailBroken?: (string | null) | undefined;
  lastSyncDateTime?: string | undefined;
  managedDeviceName?: (string | null) | undefined;
  managedDeviceOwnerType?: microsoft_graph_managedDeviceOwnerType | undefined;
  managementAgent?: microsoft_graph_managementAgentType | undefined;
  managementCertificateExpirationDate?: string | undefined;
  manufacturer?: (string | null) | undefined;
  meid?: (string | null) | undefined;
  model?: (string | null) | undefined;
  notes?: (string | null) | undefined;
  operatingSystem?: (string | null) | undefined;
  osVersion?: (string | null) | undefined;
  partnerReportedThreatState?: microsoft_graph_managedDevicePartnerReportedHealthState | undefined;
  phoneNumber?: (string | null) | undefined;
  physicalMemoryInBytes?: number | undefined;
  remoteAssistanceSessionErrorDetails?: (string | null) | undefined;
  remoteAssistanceSessionUrl?: (string | null) | undefined;
  requireUserEnrollmentApproval?: (boolean | null) | undefined;
  serialNumber?: (string | null) | undefined;
  subscriberCarrier?: (string | null) | undefined;
  totalStorageSpaceInBytes?: number | undefined;
  udid?: (string | null) | undefined;
  userDisplayName?: (string | null) | undefined;
  userId?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  wiFiMacAddress?: (string | null) | undefined;
  deviceCategory?:
    | ((microsoft_graph_deviceCategory | {}) | Array<microsoft_graph_deviceCategory | {}>)
    | undefined;
  deviceCompliancePolicyStates?: Array<microsoft_graph_deviceCompliancePolicyState> | undefined;
  deviceConfigurationStates?: Array<microsoft_graph_deviceConfigurationState> | undefined;
  logCollectionRequests?: Array<microsoft_graph_deviceLogCollectionResponse> | undefined;
  users?: Array<microsoft_graph_user> | undefined;
  windowsProtectionState?:
    | (
        | (microsoft_graph_windowsProtectionState | {})
        | Array<microsoft_graph_windowsProtectionState | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_notebook = microsoft_graph_onenoteEntityHierarchyModel & {
  isDefault?: (boolean | null) | undefined;
  isShared?: (boolean | null) | undefined;
  links?:
    | ((microsoft_graph_notebookLinks | {}) | Array<microsoft_graph_notebookLinks | {}>)
    | undefined;
  sectionGroupsUrl?: (string | null) | undefined;
  sectionsUrl?: (string | null) | undefined;
  userRole?:
    | ((microsoft_graph_onenoteUserRole | {}) | Array<microsoft_graph_onenoteUserRole | {}>)
    | undefined;
  sectionGroups?: Array<microsoft_graph_sectionGroup> | undefined;
  sections?: Array<microsoft_graph_onenoteSection> | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenotePage = microsoft_graph_onenoteEntitySchemaObjectModel & {
  content?: (string | null) | undefined;
  contentUrl?: (string | null) | undefined;
  createdByAppId?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  level?: (number | null) | undefined;
  links?: ((microsoft_graph_pageLinks | {}) | Array<microsoft_graph_pageLinks | {}>) | undefined;
  order?: (number | null) | undefined;
  title?: (string | null) | undefined;
  userTags?: Array<string | null> | undefined;
  parentNotebook?:
    | ((microsoft_graph_notebook | {}) | Array<microsoft_graph_notebook | {}>)
    | undefined;
  parentSection?:
    | ((microsoft_graph_onenoteSection | {}) | Array<microsoft_graph_onenoteSection | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_onenoteSection = microsoft_graph_onenoteEntityHierarchyModel & {
  isDefault?: (boolean | null) | undefined;
  links?:
    | ((microsoft_graph_sectionLinks | {}) | Array<microsoft_graph_sectionLinks | {}>)
    | undefined;
  pagesUrl?: (string | null) | undefined;
  pages?: Array<microsoft_graph_onenotePage> | undefined;
  parentNotebook?:
    | ((microsoft_graph_notebook | {}) | Array<microsoft_graph_notebook | {}>)
    | undefined;
  parentSectionGroup?:
    | ((microsoft_graph_sectionGroup | {}) | Array<microsoft_graph_sectionGroup | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_post = microsoft_graph_outlookItem & {
  body?: ((microsoft_graph_itemBody | {}) | Array<microsoft_graph_itemBody | {}>) | undefined;
  conversationId?: (string | null) | undefined;
  conversationThreadId?: (string | null) | undefined;
  from?: microsoft_graph_recipient | undefined;
  hasAttachments?: boolean | undefined;
  newParticipants?: Array<microsoft_graph_recipient> | undefined;
  receivedDateTime?: string | undefined;
  sender?: ((microsoft_graph_recipient | {}) | Array<microsoft_graph_recipient | {}>) | undefined;
  attachments?: Array<microsoft_graph_attachment> | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  inReplyTo?: ((microsoft_graph_post | {}) | Array<microsoft_graph_post | {}>) | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_printer = microsoft_graph_printerBase & {
  hasPhysicalDevice?: boolean | undefined;
  isShared?: boolean | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  registeredDateTime?: string | undefined;
  connectors?: Array<microsoft_graph_printConnector> | undefined;
  shares?: Array<microsoft_graph_printerShare> | undefined;
  taskTriggers?: Array<microsoft_graph_printTaskTrigger> | undefined;
  '@odata.type': string;
};
type microsoft_graph_printerShare = microsoft_graph_printerBase & {
  allowAllUsers?: boolean | undefined;
  createdDateTime?: string | undefined;
  viewPoint?:
    | (
        | (microsoft_graph_printerShareViewpoint | {})
        | Array<microsoft_graph_printerShareViewpoint | {}>
      )
    | undefined;
  allowedGroups?: Array<microsoft_graph_group> | undefined;
  allowedUsers?: Array<microsoft_graph_user> | undefined;
  printer?: ((microsoft_graph_printer | {}) | Array<microsoft_graph_printer | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_printTask = microsoft_graph_entity & {
  parentUrl?: string | undefined;
  status?: microsoft_graph_printTaskStatus | undefined;
  definition?: microsoft_graph_printTaskDefinition | undefined;
  trigger?: microsoft_graph_printTaskTrigger | undefined;
  '@odata.type': string;
};
type microsoft_graph_printTaskDefinition = microsoft_graph_entity & {
  createdBy?: microsoft_graph_appIdentity | undefined;
  displayName?: string | undefined;
  tasks?: Array<microsoft_graph_printTask> | undefined;
  '@odata.type': string;
};
type microsoft_graph_printTaskTrigger = microsoft_graph_entity & {
  event?: microsoft_graph_printEvent | undefined;
  definition?: microsoft_graph_printTaskDefinition | undefined;
  '@odata.type': string;
};
type microsoft_graph_riskyServicePrincipal = microsoft_graph_entity & {
  appId?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isEnabled?: (boolean | null) | undefined;
  isProcessing?: (boolean | null) | undefined;
  riskDetail?:
    | ((microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>)
    | undefined;
  riskLastUpdatedDateTime?: (string | null) | undefined;
  riskLevel?:
    | ((microsoft_graph_riskLevel | {}) | Array<microsoft_graph_riskLevel | {}>)
    | undefined;
  riskState?:
    | ((microsoft_graph_riskState | {}) | Array<microsoft_graph_riskState | {}>)
    | undefined;
  servicePrincipalType?: (string | null) | undefined;
  history?: Array<microsoft_graph_riskyServicePrincipalHistoryItem> | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_riskServicePrincipalActivity = {
  detail?: ((microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>) | undefined;
  riskEventTypes?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_riskyServicePrincipalHistoryItem = microsoft_graph_riskyServicePrincipal & {
  activity?:
    | (
        | (microsoft_graph_riskServicePrincipalActivity | {})
        | Array<microsoft_graph_riskServicePrincipalActivity | {}>
      )
    | undefined;
  initiatedBy?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_riskyUser = microsoft_graph_entity & {
  isDeleted?: (boolean | null) | undefined;
  isProcessing?: (boolean | null) | undefined;
  riskDetail?:
    | ((microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>)
    | undefined;
  riskLastUpdatedDateTime?: (string | null) | undefined;
  riskLevel?:
    | ((microsoft_graph_riskLevel | {}) | Array<microsoft_graph_riskLevel | {}>)
    | undefined;
  riskState?:
    | ((microsoft_graph_riskState | {}) | Array<microsoft_graph_riskState | {}>)
    | undefined;
  userDisplayName?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  history?: Array<microsoft_graph_riskyUserHistoryItem> | undefined;
  '@odata.type': string;
};
type microsoft_graph_riskUserActivity = {
  detail?: ((microsoft_graph_riskDetail | {}) | Array<microsoft_graph_riskDetail | {}>) | undefined;
  riskEventTypes?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_riskyUserHistoryItem = microsoft_graph_riskyUser & {
  activity?:
    | ((microsoft_graph_riskUserActivity | {}) | Array<microsoft_graph_riskUserActivity | {}>)
    | undefined;
  initiatedBy?: (string | null) | undefined;
  userId?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_roleAssignment = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  resourceScopes?: Array<string | null> | undefined;
  roleDefinition?:
    | ((microsoft_graph_roleDefinition | {}) | Array<microsoft_graph_roleDefinition | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_rolePermission = {
  resourceActions?: Array<microsoft_graph_resourceAction> | undefined;
  '@odata.type': string;
};
type microsoft_graph_resourceAction = {
  allowedResourceActions?: Array<string | null> | undefined;
  notAllowedResourceActions?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_roleDefinition = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isBuiltIn?: boolean | undefined;
  rolePermissions?: Array<microsoft_graph_rolePermission> | undefined;
  roleAssignments?: Array<microsoft_graph_roleAssignment> | undefined;
  '@odata.type': string;
};
type microsoft_graph_sectionGroup = microsoft_graph_onenoteEntityHierarchyModel & {
  sectionGroupsUrl?: (string | null) | undefined;
  sectionsUrl?: (string | null) | undefined;
  parentNotebook?:
    | ((microsoft_graph_notebook | {}) | Array<microsoft_graph_notebook | {}>)
    | undefined;
  parentSectionGroup?:
    | ((microsoft_graph_sectionGroup | {}) | Array<microsoft_graph_sectionGroup | {}>)
    | undefined;
  sectionGroups?: Array<microsoft_graph_sectionGroup> | undefined;
  sections?: Array<microsoft_graph_onenoteSection> | undefined;
  '@odata.type': string;
};
type microsoft_graph_sharedWithChannelTeamInfo = microsoft_graph_teamInfo & {
  isHostTeam?: (boolean | null) | undefined;
  allowedMembers?: Array<microsoft_graph_conversationMember> | undefined;
  '@odata.type': string;
};
type microsoft_graph_site = microsoft_graph_baseItem & {
  displayName?: (string | null) | undefined;
  error?:
    | ((microsoft_graph_publicError | {}) | Array<microsoft_graph_publicError | {}>)
    | undefined;
  isPersonalSite?: (boolean | null) | undefined;
  root?: ((microsoft_graph_root | {}) | Array<microsoft_graph_root | {}>) | undefined;
  sharepointIds?:
    | ((microsoft_graph_sharepointIds | {}) | Array<microsoft_graph_sharepointIds | {}>)
    | undefined;
  siteCollection?:
    | ((microsoft_graph_siteCollection | {}) | Array<microsoft_graph_siteCollection | {}>)
    | undefined;
  analytics?:
    | ((microsoft_graph_itemAnalytics | {}) | Array<microsoft_graph_itemAnalytics | {}>)
    | undefined;
  columns?: Array<microsoft_graph_columnDefinition> | undefined;
  contentTypes?: Array<microsoft_graph_contentType> | undefined;
  drive?: ((microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>) | undefined;
  drives?: Array<microsoft_graph_drive> | undefined;
  externalColumns?: Array<microsoft_graph_columnDefinition> | undefined;
  items?: Array<microsoft_graph_baseItem> | undefined;
  lists?: Array<microsoft_graph_list> | undefined;
  onenote?: ((microsoft_graph_onenote | {}) | Array<microsoft_graph_onenote | {}>) | undefined;
  operations?: Array<microsoft_graph_richLongRunningOperation> | undefined;
  pages?: Array<microsoft_graph_baseSitePage> | undefined;
  permissions?: Array<microsoft_graph_permission> | undefined;
  sites?: Array<microsoft_graph_site> | undefined;
  termStore?:
    | ((microsoft_graph_termStore_store | {}) | Array<microsoft_graph_termStore_store | {}>)
    | undefined;
  termStores?: Array<microsoft_graph_termStore_store> | undefined;
  '@odata.type': string;
};
type microsoft_graph_team = microsoft_graph_entity & {
  classification?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  firstChannelName?: (string | null) | undefined;
  funSettings?:
    | ((microsoft_graph_teamFunSettings | {}) | Array<microsoft_graph_teamFunSettings | {}>)
    | undefined;
  guestSettings?:
    | ((microsoft_graph_teamGuestSettings | {}) | Array<microsoft_graph_teamGuestSettings | {}>)
    | undefined;
  internalId?: (string | null) | undefined;
  isArchived?: (boolean | null) | undefined;
  memberSettings?:
    | ((microsoft_graph_teamMemberSettings | {}) | Array<microsoft_graph_teamMemberSettings | {}>)
    | undefined;
  messagingSettings?:
    | (
        | (microsoft_graph_teamMessagingSettings | {})
        | Array<microsoft_graph_teamMessagingSettings | {}>
      )
    | undefined;
  specialization?:
    | ((microsoft_graph_teamSpecialization | {}) | Array<microsoft_graph_teamSpecialization | {}>)
    | undefined;
  summary?:
    | ((microsoft_graph_teamSummary | {}) | Array<microsoft_graph_teamSummary | {}>)
    | undefined;
  tenantId?: (string | null) | undefined;
  visibility?:
    | ((microsoft_graph_teamVisibilityType | {}) | Array<microsoft_graph_teamVisibilityType | {}>)
    | undefined;
  webUrl?: (string | null) | undefined;
  allChannels?: Array<microsoft_graph_channel> | undefined;
  channels?: Array<microsoft_graph_channel> | undefined;
  group?: ((microsoft_graph_group | {}) | Array<microsoft_graph_group | {}>) | undefined;
  incomingChannels?: Array<microsoft_graph_channel> | undefined;
  installedApps?: Array<microsoft_graph_teamsAppInstallation> | undefined;
  members?: Array<microsoft_graph_conversationMember> | undefined;
  operations?: Array<microsoft_graph_teamsAsyncOperation> | undefined;
  permissionGrants?: Array<microsoft_graph_resourceSpecificPermissionGrant> | undefined;
  photo?:
    | ((microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>)
    | undefined;
  primaryChannel?:
    | ((microsoft_graph_channel | {}) | Array<microsoft_graph_channel | {}>)
    | undefined;
  schedule?: ((microsoft_graph_schedule | {}) | Array<microsoft_graph_schedule | {}>) | undefined;
  tags?: Array<microsoft_graph_teamworkTag> | undefined;
  template?:
    | ((microsoft_graph_teamsTemplate | {}) | Array<microsoft_graph_teamsTemplate | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_teamInfo = microsoft_graph_entity & {
  displayName?: (string | null) | undefined;
  tenantId?: (string | null) | undefined;
  team?: ((microsoft_graph_team | {}) | Array<microsoft_graph_team | {}>) | undefined;
  '@odata.type': string;
};
type microsoft_graph_termsAndConditions = microsoft_graph_entity & {
  acceptanceStatement?: (string | null) | undefined;
  bodyText?: (string | null) | undefined;
  createdDateTime?: string | undefined;
  description?: (string | null) | undefined;
  displayName?: string | undefined;
  lastModifiedDateTime?: string | undefined;
  title?: (string | null) | undefined;
  version?: number | undefined;
  acceptanceStatuses?: Array<microsoft_graph_termsAndConditionsAcceptanceStatus> | undefined;
  assignments?: Array<microsoft_graph_termsAndConditionsAssignment> | undefined;
  '@odata.type': string;
};
type microsoft_graph_termsAndConditionsAssignment = microsoft_graph_entity & {
  target?:
    | (
        | (microsoft_graph_deviceAndAppManagementAssignmentTarget | {})
        | Array<microsoft_graph_deviceAndAppManagementAssignmentTarget | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_deviceAndAppManagementAssignmentTarget = {
  '@odata.type': string;
};
type microsoft_graph_termsAndConditionsAcceptanceStatus = microsoft_graph_entity & {
  acceptedDateTime?: string | undefined;
  acceptedVersion?: number | undefined;
  userDisplayName?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  termsAndConditions?:
    | ((microsoft_graph_termsAndConditions | {}) | Array<microsoft_graph_termsAndConditions | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_unifiedRoleDefinition = microsoft_graph_entity & {
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  isBuiltIn?: (boolean | null) | undefined;
  isEnabled?: (boolean | null) | undefined;
  resourceScopes?: Array<string> | undefined;
  rolePermissions?: Array<microsoft_graph_unifiedRolePermission> | undefined;
  templateId?: (string | null) | undefined;
  version?: (string | null) | undefined;
  inheritsPermissionsFrom?: Array<microsoft_graph_unifiedRoleDefinition> | undefined;
  '@odata.type': string;
};
type microsoft_graph_unifiedRolePermission = {
  allowedResourceActions?: Array<string> | undefined;
  condition?: (string | null) | undefined;
  excludedResourceActions?: Array<string | null> | undefined;
  '@odata.type': string;
};
type microsoft_graph_user = microsoft_graph_directoryObject & {
  aboutMe?: (string | null) | undefined;
  accountEnabled?: (boolean | null) | undefined;
  ageGroup?: (string | null) | undefined;
  assignedLicenses?: Array<microsoft_graph_assignedLicense> | undefined;
  assignedPlans?: Array<microsoft_graph_assignedPlan> | undefined;
  authorizationInfo?:
    | ((microsoft_graph_authorizationInfo | {}) | Array<microsoft_graph_authorizationInfo | {}>)
    | undefined;
  birthday?: string | undefined;
  businessPhones?: Array<string> | undefined;
  city?: (string | null) | undefined;
  companyName?: (string | null) | undefined;
  consentProvidedForMinor?: (string | null) | undefined;
  country?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  creationType?: (string | null) | undefined;
  customSecurityAttributes?:
    | (
        | (microsoft_graph_customSecurityAttributeValue | {})
        | Array<microsoft_graph_customSecurityAttributeValue | {}>
      )
    | undefined;
  department?: (string | null) | undefined;
  deviceEnrollmentLimit?: number | undefined;
  displayName?: (string | null) | undefined;
  employeeHireDate?: (string | null) | undefined;
  employeeId?: (string | null) | undefined;
  employeeLeaveDateTime?: (string | null) | undefined;
  employeeOrgData?:
    | ((microsoft_graph_employeeOrgData | {}) | Array<microsoft_graph_employeeOrgData | {}>)
    | undefined;
  employeeType?: (string | null) | undefined;
  externalUserState?: (string | null) | undefined;
  externalUserStateChangeDateTime?: (string | null) | undefined;
  faxNumber?: (string | null) | undefined;
  givenName?: (string | null) | undefined;
  hireDate?: string | undefined;
  identities?: Array<microsoft_graph_objectIdentity> | undefined;
  imAddresses?: Array<string | null> | undefined;
  interests?: Array<string | null> | undefined;
  isManagementRestricted?: (boolean | null) | undefined;
  isResourceAccount?: (boolean | null) | undefined;
  jobTitle?: (string | null) | undefined;
  lastPasswordChangeDateTime?: (string | null) | undefined;
  legalAgeGroupClassification?: (string | null) | undefined;
  licenseAssignmentStates?: Array<microsoft_graph_licenseAssignmentState> | undefined;
  mail?: (string | null) | undefined;
  mailboxSettings?:
    | ((microsoft_graph_mailboxSettings | {}) | Array<microsoft_graph_mailboxSettings | {}>)
    | undefined;
  mailNickname?: (string | null) | undefined;
  mobilePhone?: (string | null) | undefined;
  mySite?: (string | null) | undefined;
  officeLocation?: (string | null) | undefined;
  onPremisesDistinguishedName?: (string | null) | undefined;
  onPremisesDomainName?: (string | null) | undefined;
  onPremisesExtensionAttributes?:
    | (
        | (microsoft_graph_onPremisesExtensionAttributes | {})
        | Array<microsoft_graph_onPremisesExtensionAttributes | {}>
      )
    | undefined;
  onPremisesImmutableId?: (string | null) | undefined;
  onPremisesLastSyncDateTime?: (string | null) | undefined;
  onPremisesProvisioningErrors?: Array<microsoft_graph_onPremisesProvisioningError> | undefined;
  onPremisesSamAccountName?: (string | null) | undefined;
  onPremisesSecurityIdentifier?: (string | null) | undefined;
  onPremisesSyncEnabled?: (boolean | null) | undefined;
  onPremisesUserPrincipalName?: (string | null) | undefined;
  otherMails?: Array<string> | undefined;
  passwordPolicies?: (string | null) | undefined;
  passwordProfile?:
    | ((microsoft_graph_passwordProfile | {}) | Array<microsoft_graph_passwordProfile | {}>)
    | undefined;
  pastProjects?: Array<string | null> | undefined;
  postalCode?: (string | null) | undefined;
  preferredDataLocation?: (string | null) | undefined;
  preferredLanguage?: (string | null) | undefined;
  preferredName?: (string | null) | undefined;
  print?: ((microsoft_graph_userPrint | {}) | Array<microsoft_graph_userPrint | {}>) | undefined;
  provisionedPlans?: Array<microsoft_graph_provisionedPlan> | undefined;
  proxyAddresses?: Array<string> | undefined;
  responsibilities?: Array<string | null> | undefined;
  schools?: Array<string | null> | undefined;
  securityIdentifier?: (string | null) | undefined;
  serviceProvisioningErrors?: Array<microsoft_graph_serviceProvisioningError> | undefined;
  showInAddressList?: (boolean | null) | undefined;
  signInActivity?:
    | ((microsoft_graph_signInActivity | {}) | Array<microsoft_graph_signInActivity | {}>)
    | undefined;
  signInSessionsValidFromDateTime?: (string | null) | undefined;
  skills?: Array<string | null> | undefined;
  state?: (string | null) | undefined;
  streetAddress?: (string | null) | undefined;
  surname?: (string | null) | undefined;
  usageLocation?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  userType?: (string | null) | undefined;
  activities?: Array<microsoft_graph_userActivity> | undefined;
  agreementAcceptances?: Array<microsoft_graph_agreementAcceptance> | undefined;
  appRoleAssignments?: Array<microsoft_graph_appRoleAssignment> | undefined;
  authentication?:
    | ((microsoft_graph_authentication | {}) | Array<microsoft_graph_authentication | {}>)
    | undefined;
  calendar?: ((microsoft_graph_calendar | {}) | Array<microsoft_graph_calendar | {}>) | undefined;
  calendarGroups?: Array<microsoft_graph_calendarGroup> | undefined;
  calendars?: Array<microsoft_graph_calendar> | undefined;
  calendarView?: Array<microsoft_graph_event> | undefined;
  chats?: Array<microsoft_graph_chat> | undefined;
  cloudClipboard?:
    | ((microsoft_graph_cloudClipboardRoot | {}) | Array<microsoft_graph_cloudClipboardRoot | {}>)
    | undefined;
  contactFolders?: Array<microsoft_graph_contactFolder> | undefined;
  contacts?: Array<microsoft_graph_contact> | undefined;
  createdObjects?: Array<microsoft_graph_directoryObject> | undefined;
  deviceManagementTroubleshootingEvents?:
    | Array<microsoft_graph_deviceManagementTroubleshootingEvent>
    | undefined;
  directReports?: Array<microsoft_graph_directoryObject> | undefined;
  drive?: ((microsoft_graph_drive | {}) | Array<microsoft_graph_drive | {}>) | undefined;
  drives?: Array<microsoft_graph_drive> | undefined;
  employeeExperience?:
    | (
        | (microsoft_graph_employeeExperienceUser | {})
        | Array<microsoft_graph_employeeExperienceUser | {}>
      )
    | undefined;
  events?: Array<microsoft_graph_event> | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  followedSites?: Array<microsoft_graph_site> | undefined;
  inferenceClassification?:
    | (
        | (microsoft_graph_inferenceClassification | {})
        | Array<microsoft_graph_inferenceClassification | {}>
      )
    | undefined;
  insights?:
    | ((microsoft_graph_itemInsights | {}) | Array<microsoft_graph_itemInsights | {}>)
    | undefined;
  joinedTeams?: Array<microsoft_graph_team> | undefined;
  licenseDetails?: Array<microsoft_graph_licenseDetails> | undefined;
  mailFolders?: Array<microsoft_graph_mailFolder> | undefined;
  managedAppRegistrations?: Array<microsoft_graph_managedAppRegistration> | undefined;
  managedDevices?: Array<microsoft_graph_managedDevice> | undefined;
  manager?:
    | ((microsoft_graph_directoryObject | {}) | Array<microsoft_graph_directoryObject | {}>)
    | undefined;
  memberOf?: Array<microsoft_graph_directoryObject> | undefined;
  messages?: Array<microsoft_graph_message> | undefined;
  oauth2PermissionGrants?: Array<microsoft_graph_oAuth2PermissionGrant> | undefined;
  onenote?: ((microsoft_graph_onenote | {}) | Array<microsoft_graph_onenote | {}>) | undefined;
  onlineMeetings?: Array<microsoft_graph_onlineMeeting> | undefined;
  outlook?:
    | ((microsoft_graph_outlookUser | {}) | Array<microsoft_graph_outlookUser | {}>)
    | undefined;
  ownedDevices?: Array<microsoft_graph_directoryObject> | undefined;
  ownedObjects?: Array<microsoft_graph_directoryObject> | undefined;
  people?: Array<microsoft_graph_person> | undefined;
  permissionGrants?: Array<microsoft_graph_resourceSpecificPermissionGrant> | undefined;
  photo?:
    | ((microsoft_graph_profilePhoto | {}) | Array<microsoft_graph_profilePhoto | {}>)
    | undefined;
  photos?: Array<microsoft_graph_profilePhoto> | undefined;
  planner?:
    | ((microsoft_graph_plannerUser | {}) | Array<microsoft_graph_plannerUser | {}>)
    | undefined;
  presence?: ((microsoft_graph_presence | {}) | Array<microsoft_graph_presence | {}>) | undefined;
  registeredDevices?: Array<microsoft_graph_directoryObject> | undefined;
  scopedRoleMemberOf?: Array<microsoft_graph_scopedRoleMembership> | undefined;
  settings?:
    | ((microsoft_graph_userSettings | {}) | Array<microsoft_graph_userSettings | {}>)
    | undefined;
  solutions?:
    | ((microsoft_graph_userSolutionRoot | {}) | Array<microsoft_graph_userSolutionRoot | {}>)
    | undefined;
  sponsors?: Array<microsoft_graph_directoryObject> | undefined;
  teamwork?:
    | ((microsoft_graph_userTeamwork | {}) | Array<microsoft_graph_userTeamwork | {}>)
    | undefined;
  todo?: ((microsoft_graph_todo | {}) | Array<microsoft_graph_todo | {}>) | undefined;
  transitiveMemberOf?: Array<microsoft_graph_directoryObject> | undefined;
  '@odata.type': string;
};
type microsoft_graph_userActivity = microsoft_graph_entity & {
  activationUrl?: string | undefined;
  activitySourceHost?: string | undefined;
  appActivityId?: string | undefined;
  appDisplayName?: (string | null) | undefined;
  contentInfo?: unknown | undefined;
  contentUrl?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  expirationDateTime?: (string | null) | undefined;
  fallbackUrl?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  status?: ((microsoft_graph_status | {}) | Array<microsoft_graph_status | {}>) | undefined;
  userTimezone?: (string | null) | undefined;
  visualElements?: microsoft_graph_visualInfo | undefined;
  historyItems?: Array<microsoft_graph_activityHistoryItem> | undefined;
  '@odata.type': string;
};
type microsoft_graph_userTeamwork = microsoft_graph_entity & {
  locale?: (string | null) | undefined;
  region?: (string | null) | undefined;
  associatedTeams?: Array<microsoft_graph_associatedTeamInfo> | undefined;
  installedApps?: Array<microsoft_graph_userScopeTeamsAppInstallation> | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookChart = microsoft_graph_entity & {
  height?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  left?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  name?: (string | null) | undefined;
  top?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  width?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  axes?:
    | ((microsoft_graph_workbookChartAxes | {}) | Array<microsoft_graph_workbookChartAxes | {}>)
    | undefined;
  dataLabels?:
    | (
        | (microsoft_graph_workbookChartDataLabels | {})
        | Array<microsoft_graph_workbookChartDataLabels | {}>
      )
    | undefined;
  format?:
    | (
        | (microsoft_graph_workbookChartAreaFormat | {})
        | Array<microsoft_graph_workbookChartAreaFormat | {}>
      )
    | undefined;
  legend?:
    | ((microsoft_graph_workbookChartLegend | {}) | Array<microsoft_graph_workbookChartLegend | {}>)
    | undefined;
  series?: Array<microsoft_graph_workbookChartSeries> | undefined;
  title?:
    | ((microsoft_graph_workbookChartTitle | {}) | Array<microsoft_graph_workbookChartTitle | {}>)
    | undefined;
  worksheet?:
    | ((microsoft_graph_workbookWorksheet | {}) | Array<microsoft_graph_workbookWorksheet | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookNamedItem = microsoft_graph_entity & {
  comment?: (string | null) | undefined;
  name?: (string | null) | undefined;
  scope?: string | undefined;
  type?: (string | null) | undefined;
  value?: unknown | undefined;
  visible?: boolean | undefined;
  worksheet?:
    | ((microsoft_graph_workbookWorksheet | {}) | Array<microsoft_graph_workbookWorksheet | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookPivotTable = microsoft_graph_entity & {
  name?: (string | null) | undefined;
  worksheet?:
    | ((microsoft_graph_workbookWorksheet | {}) | Array<microsoft_graph_workbookWorksheet | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookRangeView = microsoft_graph_entity & {
  cellAddresses?: unknown | undefined;
  columnCount?: number | undefined;
  formulas?: unknown | undefined;
  formulasLocal?: unknown | undefined;
  formulasR1C1?: unknown | undefined;
  index?: number | undefined;
  numberFormat?: unknown | undefined;
  rowCount?: number | undefined;
  text?: unknown | undefined;
  values?: unknown | undefined;
  valueTypes?: unknown | undefined;
  rows?: Array<microsoft_graph_workbookRangeView> | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookTable = microsoft_graph_entity & {
  highlightFirstColumn?: boolean | undefined;
  highlightLastColumn?: boolean | undefined;
  legacyId?: (string | null) | undefined;
  name?: (string | null) | undefined;
  showBandedColumns?: boolean | undefined;
  showBandedRows?: boolean | undefined;
  showFilterButton?: boolean | undefined;
  showHeaders?: boolean | undefined;
  showTotals?: boolean | undefined;
  style?: (string | null) | undefined;
  columns?: Array<microsoft_graph_workbookTableColumn> | undefined;
  rows?: Array<microsoft_graph_workbookTableRow> | undefined;
  sort?:
    | ((microsoft_graph_workbookTableSort | {}) | Array<microsoft_graph_workbookTableSort | {}>)
    | undefined;
  worksheet?:
    | ((microsoft_graph_workbookWorksheet | {}) | Array<microsoft_graph_workbookWorksheet | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookWorksheet = microsoft_graph_entity & {
  name?: (string | null) | undefined;
  position?: number | undefined;
  visibility?: string | undefined;
  charts?: Array<microsoft_graph_workbookChart> | undefined;
  names?: Array<microsoft_graph_workbookNamedItem> | undefined;
  pivotTables?: Array<microsoft_graph_workbookPivotTable> | undefined;
  protection?:
    | (
        | (microsoft_graph_workbookWorksheetProtection | {})
        | Array<microsoft_graph_workbookWorksheetProtection | {}>
      )
    | undefined;
  tables?: Array<microsoft_graph_workbookTable> | undefined;
  '@odata.type': string;
};
type microsoft_graph_attributeMappingSource = {
  expression?: (string | null) | undefined;
  name?: (string | null) | undefined;
  parameters?: Array<microsoft_graph_stringKeyAttributeMappingSourceValuePair> | undefined;
  type?: microsoft_graph_attributeMappingSourceType | undefined;
  '@odata.type': string;
};
type microsoft_graph_attributeMappingSourceType = 'Attribute' | 'Constant' | 'Function';
type microsoft_graph_stringKeyAttributeMappingSourceValuePair = {
  key?: (string | null) | undefined;
  value?:
    | (
        | (microsoft_graph_attributeMappingSource | {})
        | Array<microsoft_graph_attributeMappingSource | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_synchronizationJobSubject = {
  links?:
    | (
        | (microsoft_graph_synchronizationLinkedObjects | {})
        | Array<microsoft_graph_synchronizationLinkedObjects | {}>
      )
    | undefined;
  objectId?: (string | null) | undefined;
  objectTypeName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_synchronizationLinkedObjects = {
  manager?:
    | (
        | (microsoft_graph_synchronizationJobSubject | {})
        | Array<microsoft_graph_synchronizationJobSubject | {}>
      )
    | undefined;
  members?: Array<microsoft_graph_synchronizationJobSubject> | undefined;
  owners?: Array<microsoft_graph_synchronizationJobSubject> | undefined;
  '@odata.type': string;
};
type microsoft_graph_userPrint = {
  recentPrinterShares?: Array<microsoft_graph_printerShare> | undefined;
  '@odata.type': string;
};
type microsoft_graph_workbookOperationError = {
  code?: (string | null) | undefined;
  innerError?:
    | (
        | (microsoft_graph_workbookOperationError | {})
        | Array<microsoft_graph_workbookOperationError | {}>
      )
    | undefined;
  message?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_identityGovernance_task = microsoft_graph_entity & {
  arguments?: Array<microsoft_graph_keyValuePair> | undefined;
  category?: microsoft_graph_identityGovernance_lifecycleTaskCategory | undefined;
  continueOnError?: boolean | undefined;
  description?: (string | null) | undefined;
  displayName?: string | undefined;
  executionSequence?: number | undefined;
  isEnabled?: boolean | undefined;
  taskDefinitionId?: string | undefined;
  taskProcessingResults?:
    | Array<microsoft_graph_identityGovernance_taskProcessingResult>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_keyValuePair = {
  name?: string | undefined;
  value?: (string | null) | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_identityGovernance_taskProcessingResult = microsoft_graph_entity & {
  completedDateTime?: (string | null) | undefined;
  createdDateTime?: string | undefined;
  failureReason?: (string | null) | undefined;
  processingStatus?:
    | microsoft_graph_identityGovernance_lifecycleWorkflowProcessingStatus
    | undefined;
  startedDateTime?: (string | null) | undefined;
  subject?: microsoft_graph_user | undefined;
  task?: microsoft_graph_identityGovernance_task | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_ediscoveryAddToReviewSetOperation =
  microsoft_graph_security_caseOperation & {
    reviewSet?:
      | (
          | (microsoft_graph_security_ediscoveryReviewSet | {})
          | Array<microsoft_graph_security_ediscoveryReviewSet | {}>
        )
      | undefined;
    search?:
      | (
          | (microsoft_graph_security_ediscoverySearch | {})
          | Array<microsoft_graph_security_ediscoverySearch | {}>
        )
      | undefined;
    '@odata.type': string;
  };
type microsoft_graph_security_caseOperation = microsoft_graph_entity & {
  action?:
    | ((microsoft_graph_security_caseAction | {}) | Array<microsoft_graph_security_caseAction | {}>)
    | undefined;
  completedDateTime?: (string | null) | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  percentProgress?: (number | null) | undefined;
  resultInfo?:
    | ((microsoft_graph_resultInfo | {}) | Array<microsoft_graph_resultInfo | {}>)
    | undefined;
  status?:
    | (
        | (microsoft_graph_security_caseOperationStatus | {})
        | Array<microsoft_graph_security_caseOperationStatus | {}>
      )
    | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_resultInfo = {
  code?: number | undefined;
  message?: (string | null) | undefined;
  subcode?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_caseOperationStatus =
  | 'notStarted'
  | 'submissionFailed'
  | 'running'
  | 'succeeded'
  | 'partiallySucceeded'
  | 'failed'
  | 'unknownFutureValue';
type microsoft_graph_security_ediscoveryReviewSet = microsoft_graph_security_dataSet & {
  queries?: Array<microsoft_graph_security_ediscoveryReviewSetQuery> | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_dataSet = microsoft_graph_entity & {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_ediscoveryReviewSetQuery = microsoft_graph_security_search & {
  '@odata.type': string;
};
type microsoft_graph_security_search = microsoft_graph_entity & {
  contentQuery?: (string | null) | undefined;
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_dataSourceScopes =
  | 'none'
  | 'allTenantMailboxes'
  | 'allTenantSites'
  | 'allCaseCustodians'
  | 'allCaseNoncustodialDataSources'
  | 'unknownFutureValue';
type microsoft_graph_security_dataSource = microsoft_graph_entity & {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  createdDateTime?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  holdStatus?:
    | (
        | (microsoft_graph_security_dataSourceHoldStatus | {})
        | Array<microsoft_graph_security_dataSourceHoldStatus | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_dataSourceHoldStatus =
  | 'notApplied'
  | 'applied'
  | 'applying'
  | 'removing'
  | 'partial'
  | 'unknownFutureValue';
type microsoft_graph_security_ediscoveryNoncustodialDataSource =
  microsoft_graph_security_dataSourceContainer & {
    dataSource?:
      | (
          | (microsoft_graph_security_dataSource | {})
          | Array<microsoft_graph_security_dataSource | {}>
        )
      | undefined;
    lastIndexOperation?:
      | (
          | (microsoft_graph_security_ediscoveryIndexOperation | {})
          | Array<microsoft_graph_security_ediscoveryIndexOperation | {}>
        )
      | undefined;
    '@odata.type': string;
  };
type microsoft_graph_security_dataSourceContainer = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  holdStatus?:
    | (
        | (microsoft_graph_security_dataSourceHoldStatus | {})
        | Array<microsoft_graph_security_dataSourceHoldStatus | {}>
      )
    | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  releasedDateTime?: (string | null) | undefined;
  status?:
    | (
        | (microsoft_graph_security_dataSourceContainerStatus | {})
        | Array<microsoft_graph_security_dataSourceContainerStatus | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_dataSourceContainerStatus =
  | 'active'
  | 'released'
  | 'unknownFutureValue';
type microsoft_graph_security_ediscoveryIndexOperation = microsoft_graph_security_caseOperation & {
  '@odata.type': string;
};
type microsoft_graph_security_ediscoveryEstimateOperation =
  microsoft_graph_security_caseOperation & {
    indexedItemCount?: (number | null) | undefined;
    indexedItemsSize?: (number | null) | undefined;
    mailboxCount?: (number | null) | undefined;
    siteCount?: (number | null) | undefined;
    unindexedItemCount?: (number | null) | undefined;
    unindexedItemsSize?: (number | null) | undefined;
    search?:
      | (
          | (microsoft_graph_security_ediscoverySearch | {})
          | Array<microsoft_graph_security_ediscoverySearch | {}>
        )
      | undefined;
    '@odata.type': string;
  };
type microsoft_graph_security_ediscoveryReviewTag = microsoft_graph_security_tag & {
  childSelectability?:
    | (
        | (microsoft_graph_security_childSelectability | {})
        | Array<microsoft_graph_security_childSelectability | {}>
      )
    | undefined;
  childTags?: Array<microsoft_graph_security_ediscoveryReviewTag> | undefined;
  parent?:
    | (
        | (microsoft_graph_security_ediscoveryReviewTag | {})
        | Array<microsoft_graph_security_ediscoveryReviewTag | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_tag = microsoft_graph_entity & {
  createdBy?:
    | ((microsoft_graph_identitySet | {}) | Array<microsoft_graph_identitySet | {}>)
    | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_childSelectability = 'One' | 'Many' | 'unknownFutureValue';
type microsoft_graph_security_ediscoverySearch = microsoft_graph_security_search & {
  dataSourceScopes?:
    | (
        | (microsoft_graph_security_dataSourceScopes | {})
        | Array<microsoft_graph_security_dataSourceScopes | {}>
      )
    | undefined;
  additionalSources?: Array<microsoft_graph_security_dataSource> | undefined;
  addToReviewSetOperation?:
    | (
        | (microsoft_graph_security_ediscoveryAddToReviewSetOperation | {})
        | Array<microsoft_graph_security_ediscoveryAddToReviewSetOperation | {}>
      )
    | undefined;
  custodianSources?: Array<microsoft_graph_security_dataSource> | undefined;
  lastEstimateStatisticsOperation?:
    | (
        | (microsoft_graph_security_ediscoveryEstimateOperation | {})
        | Array<microsoft_graph_security_ediscoveryEstimateOperation | {}>
      )
    | undefined;
  noncustodialSources?:
    | Array<microsoft_graph_security_ediscoveryNoncustodialDataSource>
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_host = microsoft_graph_security_artifact & {
  firstSeenDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  childHostPairs?: Array<microsoft_graph_security_hostPair> | undefined;
  components?: Array<microsoft_graph_security_hostComponent> | undefined;
  cookies?: Array<microsoft_graph_security_hostCookie> | undefined;
  hostPairs?: Array<microsoft_graph_security_hostPair> | undefined;
  parentHostPairs?: Array<microsoft_graph_security_hostPair> | undefined;
  passiveDns?: Array<microsoft_graph_security_passiveDnsRecord> | undefined;
  passiveDnsReverse?: Array<microsoft_graph_security_passiveDnsRecord> | undefined;
  ports?: Array<microsoft_graph_security_hostPort> | undefined;
  reputation?:
    | (
        | (microsoft_graph_security_hostReputation | {})
        | Array<microsoft_graph_security_hostReputation | {}>
      )
    | undefined;
  sslCertificates?: Array<microsoft_graph_security_hostSslCertificate> | undefined;
  subdomains?: Array<microsoft_graph_security_subdomain> | undefined;
  trackers?: Array<microsoft_graph_security_hostTracker> | undefined;
  whois?:
    | (
        | (microsoft_graph_security_whoisRecord | {})
        | Array<microsoft_graph_security_whoisRecord | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_artifact = microsoft_graph_entity & {
  '@odata.type': string;
};
type microsoft_graph_security_hostPortBanner = {
  banner?: string | undefined;
  firstSeenDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  scanProtocol?: (string | null) | undefined;
  timesObserved?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostPortProtocol = 'tcp' | 'udp' | 'unknownFutureValue';
type microsoft_graph_security_hostPortStatus =
  | 'open'
  | 'filtered'
  | 'closed'
  | 'unknownFutureValue';
type microsoft_graph_security_sslCertificateEntity = {
  address?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  alternateNames?: Array<string | null> | undefined;
  commonName?: (string | null) | undefined;
  email?: (string | null) | undefined;
  givenName?: (string | null) | undefined;
  organizationName?: (string | null) | undefined;
  organizationUnitName?: (string | null) | undefined;
  serialNumber?: (string | null) | undefined;
  surname?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostReputation = microsoft_graph_entity & {
  classification?: microsoft_graph_security_hostReputationClassification | undefined;
  rules?: Array<microsoft_graph_security_hostReputationRule> | undefined;
  score?: number | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostReputationClassification =
  | 'unknown'
  | 'neutral'
  | 'suspicious'
  | 'malicious'
  | 'unknownFutureValue';
type microsoft_graph_security_hostReputationRule = {
  description?: string | undefined;
  name?: string | undefined;
  relatedDetailsUrl?: (string | null) | undefined;
  severity?: microsoft_graph_security_hostReputationRuleSeverity | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostReputationRuleSeverity =
  | 'unknown'
  | 'low'
  | 'medium'
  | 'high'
  | 'unknownFutureValue';
type microsoft_graph_security_hostSslCertificatePort = {
  firstSeenDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  port?: (number | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_whoisContact = {
  address?:
    | ((microsoft_graph_physicalAddress | {}) | Array<microsoft_graph_physicalAddress | {}>)
    | undefined;
  email?: (string | null) | undefined;
  fax?: (string | null) | undefined;
  name?: (string | null) | undefined;
  organization?: (string | null) | undefined;
  telephone?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostComponent = microsoft_graph_security_artifact & {
  category?: (string | null) | undefined;
  firstSeenDateTime?: string | undefined;
  lastSeenDateTime?: string | undefined;
  name?: string | undefined;
  version?: (string | null) | undefined;
  host?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostCookie = microsoft_graph_security_artifact & {
  domain?: string | undefined;
  firstSeenDateTime?: string | undefined;
  lastSeenDateTime?: string | undefined;
  name?: string | undefined;
  host?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostPair = microsoft_graph_entity & {
  firstSeenDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  linkKind?: (string | null) | undefined;
  childHost?: microsoft_graph_security_host | undefined;
  parentHost?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostPort = microsoft_graph_entity & {
  banners?: Array<microsoft_graph_security_hostPortBanner> | undefined;
  firstSeenDateTime?: (string | null) | undefined;
  lastScanDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  port?: number | undefined;
  protocol?:
    | (
        | (microsoft_graph_security_hostPortProtocol | {})
        | Array<microsoft_graph_security_hostPortProtocol | {}>
      )
    | undefined;
  services?: Array<microsoft_graph_security_hostPortComponent> | undefined;
  status?:
    | (
        | (microsoft_graph_security_hostPortStatus | {})
        | Array<microsoft_graph_security_hostPortStatus | {}>
      )
    | undefined;
  timesObserved?: (number | null) | undefined;
  host?: microsoft_graph_security_host | undefined;
  mostRecentSslCertificate?:
    | (
        | (microsoft_graph_security_sslCertificate | {})
        | Array<microsoft_graph_security_sslCertificate | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostSslCertificate = microsoft_graph_security_artifact & {
  firstSeenDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  ports?: Array<microsoft_graph_security_hostSslCertificatePort> | undefined;
  host?:
    | ((microsoft_graph_security_host | {}) | Array<microsoft_graph_security_host | {}>)
    | undefined;
  sslCertificate?:
    | (
        | (microsoft_graph_security_sslCertificate | {})
        | Array<microsoft_graph_security_sslCertificate | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostTracker = microsoft_graph_security_artifact & {
  firstSeenDateTime?: string | undefined;
  kind?: string | undefined;
  lastSeenDateTime?: string | undefined;
  value?: string | undefined;
  host?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_passiveDnsRecord = microsoft_graph_security_artifact & {
  collectedDateTime?: string | undefined;
  firstSeenDateTime?: string | undefined;
  lastSeenDateTime?: string | undefined;
  recordType?: string | undefined;
  artifact?: microsoft_graph_security_artifact | undefined;
  parentHost?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_sslCertificate = microsoft_graph_security_artifact & {
  expirationDateTime?: (string | null) | undefined;
  fingerprint?: (string | null) | undefined;
  firstSeenDateTime?: (string | null) | undefined;
  issueDateTime?: (string | null) | undefined;
  issuer?:
    | (
        | (microsoft_graph_security_sslCertificateEntity | {})
        | Array<microsoft_graph_security_sslCertificateEntity | {}>
      )
    | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  serialNumber?: (string | null) | undefined;
  sha1?: (string | null) | undefined;
  subject?:
    | (
        | (microsoft_graph_security_sslCertificateEntity | {})
        | Array<microsoft_graph_security_sslCertificateEntity | {}>
      )
    | undefined;
  relatedHosts?: Array<microsoft_graph_security_host> | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_subdomain = microsoft_graph_entity & {
  firstSeenDateTime?: (string | null) | undefined;
  host?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_whoisBaseRecord = microsoft_graph_entity & {
  abuse?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  admin?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  billing?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  domainStatus?: (string | null) | undefined;
  expirationDateTime?: (string | null) | undefined;
  firstSeenDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  lastUpdateDateTime?: (string | null) | undefined;
  nameservers?: Array<microsoft_graph_security_whoisNameserver> | undefined;
  noc?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  rawWhoisText?: (string | null) | undefined;
  registrant?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  registrar?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  registrationDateTime?: (string | null) | undefined;
  technical?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  whoisServer?: (string | null) | undefined;
  zone?:
    | (
        | (microsoft_graph_security_whoisContact | {})
        | Array<microsoft_graph_security_whoisContact | {}>
      )
    | undefined;
  host?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_whoisHistoryRecord = microsoft_graph_security_whoisBaseRecord & {
  '@odata.type': string;
};
type microsoft_graph_security_whoisRecord = microsoft_graph_security_whoisBaseRecord & {
  history?: Array<microsoft_graph_security_whoisHistoryRecord> | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_containerEvidence = microsoft_graph_security_alertEvidence & {
  args?: Array<string | null> | undefined;
  command?: Array<string | null> | undefined;
  containerId?: (string | null) | undefined;
  image?:
    | (
        | (microsoft_graph_security_containerImageEvidence | {})
        | Array<microsoft_graph_security_containerImageEvidence | {}>
      )
    | undefined;
  isPrivileged?: boolean | undefined;
  name?: (string | null) | undefined;
  pod?:
    | (
        | (microsoft_graph_security_kubernetesPodEvidence | {})
        | Array<microsoft_graph_security_kubernetesPodEvidence | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_alertEvidence = {
  createdDateTime?: string | undefined;
  detailedRoles?: Array<string | null> | undefined;
  remediationStatus?: microsoft_graph_security_evidenceRemediationStatus | undefined;
  remediationStatusDetails?: (string | null) | undefined;
  roles?: Array<microsoft_graph_security_evidenceRole> | undefined;
  tags?: Array<string | null> | undefined;
  verdict?: microsoft_graph_security_evidenceVerdict | undefined;
  '@odata.type': string;
};
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
type microsoft_graph_security_containerRegistryEvidence = microsoft_graph_security_alertEvidence & {
  registry?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_kubernetesControllerEvidence =
  microsoft_graph_security_alertEvidence & {
    labels?:
      | (
          | (microsoft_graph_security_dictionary | {})
          | Array<microsoft_graph_security_dictionary | {}>
        )
      | undefined;
    name?: (string | null) | undefined;
    namespace?:
      | (
          | (microsoft_graph_security_kubernetesNamespaceEvidence | {})
          | Array<microsoft_graph_security_kubernetesNamespaceEvidence | {}>
        )
      | undefined;
    type?: (string | null) | undefined;
    '@odata.type': string;
  };
type microsoft_graph_security_dictionary = {
  '@odata.type': string;
};
type microsoft_graph_security_kubernetesNamespaceEvidence =
  microsoft_graph_security_alertEvidence & {
    cluster?:
      | (
          | (microsoft_graph_security_kubernetesClusterEvidence | {})
          | Array<microsoft_graph_security_kubernetesClusterEvidence | {}>
        )
      | undefined;
    labels?:
      | (
          | (microsoft_graph_security_dictionary | {})
          | Array<microsoft_graph_security_dictionary | {}>
        )
      | undefined;
    name?: (string | null) | undefined;
    '@odata.type': string;
  };
type microsoft_graph_security_kubernetesClusterEvidence = microsoft_graph_security_alertEvidence & {
  cloudResource?:
    | (
        | (microsoft_graph_security_alertEvidence | {})
        | Array<microsoft_graph_security_alertEvidence | {}>
      )
    | undefined;
  distribution?: (string | null) | undefined;
  name?: (string | null) | undefined;
  platform?:
    | (
        | (microsoft_graph_security_kubernetesPlatform | {})
        | Array<microsoft_graph_security_kubernetesPlatform | {}>
      )
    | undefined;
  version?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_kubernetesPlatform =
  | 'unknown'
  | 'aks'
  | 'eks'
  | 'gke'
  | 'arc'
  | 'unknownFutureValue';
type microsoft_graph_security_ipEvidence = microsoft_graph_security_alertEvidence & {
  countryLetterCode?: (string | null) | undefined;
  ipAddress?: (string | null) | undefined;
  location?:
    | (
        | (microsoft_graph_security_geoLocation | {})
        | Array<microsoft_graph_security_geoLocation | {}>
      )
    | undefined;
  stream?:
    | ((microsoft_graph_security_stream | {}) | Array<microsoft_graph_security_stream | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_geoLocation = {
  city?: (string | null) | undefined;
  countryName?: (string | null) | undefined;
  latitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  longitude?: ((number | null) | (string | null) | ReferenceNumeric) | undefined;
  state?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_stream = {
  name?: (string | null) | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_kubernetesServiceAccountEvidence =
  microsoft_graph_security_alertEvidence & {
    name?: (string | null) | undefined;
    namespace?:
      | (
          | (microsoft_graph_security_kubernetesNamespaceEvidence | {})
          | Array<microsoft_graph_security_kubernetesNamespaceEvidence | {}>
        )
      | undefined;
    '@odata.type': string;
  };
type microsoft_graph_security_containerImageEvidence = microsoft_graph_security_alertEvidence & {
  digestImage?:
    | (
        | (microsoft_graph_security_containerImageEvidence | {})
        | Array<microsoft_graph_security_containerImageEvidence | {}>
      )
    | undefined;
  imageId?: (string | null) | undefined;
  registry?:
    | (
        | (microsoft_graph_security_containerRegistryEvidence | {})
        | Array<microsoft_graph_security_containerRegistryEvidence | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_hostPortComponent = {
  firstSeenDateTime?: (string | null) | undefined;
  isRecent?: (boolean | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  component?:
    | (
        | (microsoft_graph_security_hostComponent | {})
        | Array<microsoft_graph_security_hostComponent | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_kubernetesPodEvidence = microsoft_graph_security_alertEvidence & {
  containers?: Array<microsoft_graph_security_containerEvidence> | undefined;
  controller?:
    | (
        | (microsoft_graph_security_kubernetesControllerEvidence | {})
        | Array<microsoft_graph_security_kubernetesControllerEvidence | {}>
      )
    | undefined;
  ephemeralContainers?: Array<microsoft_graph_security_containerEvidence> | undefined;
  initContainers?: Array<microsoft_graph_security_containerEvidence> | undefined;
  labels?:
    | ((microsoft_graph_security_dictionary | {}) | Array<microsoft_graph_security_dictionary | {}>)
    | undefined;
  name?: (string | null) | undefined;
  namespace?:
    | (
        | (microsoft_graph_security_kubernetesNamespaceEvidence | {})
        | Array<microsoft_graph_security_kubernetesNamespaceEvidence | {}>
      )
    | undefined;
  podIp?:
    | ((microsoft_graph_security_ipEvidence | {}) | Array<microsoft_graph_security_ipEvidence | {}>)
    | undefined;
  serviceAccount?:
    | (
        | (microsoft_graph_security_kubernetesServiceAccountEvidence | {})
        | Array<microsoft_graph_security_kubernetesServiceAccountEvidence | {}>
      )
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_security_whoisNameserver = {
  firstSeenDateTime?: (string | null) | undefined;
  lastSeenDateTime?: (string | null) | undefined;
  host?: microsoft_graph_security_host | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_group = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  parentSiteId?: (string | null) | undefined;
  scope?:
    | (
        | (microsoft_graph_termStore_termGroupScope | {})
        | Array<microsoft_graph_termStore_termGroupScope | {}>
      )
    | undefined;
  sets?: Array<microsoft_graph_termStore_set> | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_relation = microsoft_graph_entity & {
  relationship?:
    | (
        | (microsoft_graph_termStore_relationType | {})
        | Array<microsoft_graph_termStore_relationType | {}>
      )
    | undefined;
  fromTerm?:
    | ((microsoft_graph_termStore_term | {}) | Array<microsoft_graph_termStore_term | {}>)
    | undefined;
  set?:
    | ((microsoft_graph_termStore_set | {}) | Array<microsoft_graph_termStore_set | {}>)
    | undefined;
  toTerm?:
    | ((microsoft_graph_termStore_term | {}) | Array<microsoft_graph_termStore_term | {}>)
    | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_set = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  localizedNames?: Array<microsoft_graph_termStore_localizedName> | undefined;
  properties?: Array<microsoft_graph_keyValue> | undefined;
  children?: Array<microsoft_graph_termStore_term> | undefined;
  parentGroup?: microsoft_graph_termStore_group | undefined;
  relations?: Array<microsoft_graph_termStore_relation> | undefined;
  terms?: Array<microsoft_graph_termStore_term> | undefined;
  '@odata.type': string;
};
type microsoft_graph_termStore_term = microsoft_graph_entity & {
  createdDateTime?: (string | null) | undefined;
  descriptions?: Array<microsoft_graph_termStore_localizedDescription> | undefined;
  labels?: Array<microsoft_graph_termStore_localizedLabel> | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  properties?: Array<microsoft_graph_keyValue> | undefined;
  children?: Array<microsoft_graph_termStore_term> | undefined;
  relations?: Array<microsoft_graph_termStore_relation> | undefined;
  set?:
    | ((microsoft_graph_termStore_set | {}) | Array<microsoft_graph_termStore_set | {}>)
    | undefined;
  '@odata.type': string;
};

const BaseCollectionPaginationCountResponse = z
  .object({ '@odata.count': z.number().int().nullable(), '@odata.nextLink': z.string().nullable() })
  .partial()
  .passthrough();
const microsoft_graph_entity = z
  .object({ id: z.string().optional(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_identity = z
  .object({
    displayName: z.string().nullish(),
    id: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_identitySet = z
  .object({
    application: z
      .union([microsoft_graph_identity, z.object({}).partial().passthrough()])
      .optional(),
    device: z.union([microsoft_graph_identity, z.object({}).partial().passthrough()]).optional(),
    user: z.union([microsoft_graph_identity, z.object({}).partial().passthrough()]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_sharepointIds = z
  .object({
    listId: z.string().nullish(),
    listItemId: z.string().nullish(),
    listItemUniqueId: z.string().nullish(),
    siteId: z.string().nullish(),
    siteUrl: z.string().nullish(),
    tenantId: z.string().nullish(),
    webId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_itemReference = z
  .object({
    driveId: z.string().nullish(),
    driveType: z.string().nullish(),
    id: z.string().nullish(),
    name: z.string().nullish(),
    path: z.string().nullish(),
    shareId: z.string().nullish(),
    sharepointIds: z
      .union([microsoft_graph_sharepointIds, z.object({}).partial().passthrough()])
      .optional(),
    siteId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_directoryObject = microsoft_graph_entity.and(
  z
    .object({
      deletedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
      .optional(),
    skuId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_assignedPlan = z
  .object({
    assignedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    capabilityStatus: z.string().nullish(),
    service: z.string().nullish(),
    servicePlanId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_authorizationInfo = z
  .object({
    certificateUserIds: z.array(z.string().nullable()).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_customSecurityAttributeValue = z
  .object({ '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_employeeOrgData = z
  .object({
    costCenter: z.string().nullish(),
    division: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_objectIdentity = z
  .object({
    issuer: z.string().nullish(),
    issuerAssignedId: z.string().nullish(),
    signInType: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_licenseAssignmentState = z
  .object({
    assignedByGroup: z.string().nullish(),
    disabledPlans: z
      .array(
        z
          .string()
          .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
          .uuid()
          .nullable()
      )
      .optional(),
    error: z.string().nullish(),
    lastUpdatedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    skuId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .nullish(),
    state: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_externalAudienceScope = z.enum(['none', 'contactsOnly', 'all']);
const microsoft_graph_dateTimeTimeZone = z
  .object({
    dateTime: z.string().optional(),
    timeZone: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_automaticRepliesStatus = z.enum(['disabled', 'alwaysEnabled', 'scheduled']);
const microsoft_graph_automaticRepliesSetting = z
  .object({
    externalAudience: z
      .union([microsoft_graph_externalAudienceScope, z.object({}).partial().passthrough()])
      .optional(),
    externalReplyMessage: z.string().nullish(),
    internalReplyMessage: z.string().nullish(),
    scheduledEndDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
      .optional(),
    scheduledStartDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
      .optional(),
    status: z
      .union([microsoft_graph_automaticRepliesStatus, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_delegateMeetingMessageDeliveryOptions = z.enum([
  'sendToDelegateAndInformationToPrincipal',
  'sendToDelegateAndPrincipal',
  'sendToDelegateOnly',
]);
const microsoft_graph_localeInfo = z
  .object({
    displayName: z.string().nullish(),
    locale: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
  .object({ name: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_workingHours = z
  .object({
    daysOfWeek: z
      .array(z.union([microsoft_graph_dayOfWeek, z.object({}).partial().passthrough()]))
      .optional(),
    endTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .nullish(),
    startTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .nullish(),
    timeZone: z
      .union([microsoft_graph_timeZoneBase, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_mailboxSettings = z
  .object({
    archiveFolder: z.string().nullish(),
    automaticRepliesSetting: z
      .union([microsoft_graph_automaticRepliesSetting, z.object({}).partial().passthrough()])
      .optional(),
    dateFormat: z.string().nullish(),
    delegateMeetingMessageDeliveryOptions: z
      .union([
        microsoft_graph_delegateMeetingMessageDeliveryOptions,
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    language: z
      .union([microsoft_graph_localeInfo, z.object({}).partial().passthrough()])
      .optional(),
    timeFormat: z.string().nullish(),
    timeZone: z.string().nullish(),
    userPurpose: z
      .union([microsoft_graph_userPurpose, z.object({}).partial().passthrough()])
      .optional(),
    workingHours: z
      .union([microsoft_graph_workingHours, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_onPremisesExtensionAttributes = z
  .object({
    extensionAttribute1: z.string().nullish(),
    extensionAttribute10: z.string().nullish(),
    extensionAttribute11: z.string().nullish(),
    extensionAttribute12: z.string().nullish(),
    extensionAttribute13: z.string().nullish(),
    extensionAttribute14: z.string().nullish(),
    extensionAttribute15: z.string().nullish(),
    extensionAttribute2: z.string().nullish(),
    extensionAttribute3: z.string().nullish(),
    extensionAttribute4: z.string().nullish(),
    extensionAttribute5: z.string().nullish(),
    extensionAttribute6: z.string().nullish(),
    extensionAttribute7: z.string().nullish(),
    extensionAttribute8: z.string().nullish(),
    extensionAttribute9: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_onPremisesProvisioningError = z
  .object({
    category: z.string().nullish(),
    occurredDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    propertyCausingError: z.string().nullish(),
    value: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_passwordProfile = z
  .object({
    forceChangePasswordNextSignIn: z.boolean().nullish(),
    forceChangePasswordNextSignInWithMfa: z.boolean().nullish(),
    password: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_printColorMode = z.enum([
  'blackAndWhite',
  'grayscale',
  'color',
  'auto',
  'unknownFutureValue',
]);
const microsoft_graph_integerRange = z
  .object({ end: z.number().nullish(), start: z.number().nullish(), '@odata.type': z.string() })
  .passthrough();
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
    bottomMargins: z.array(z.number().gte(-2147483648).lte(2147483647).nullable()).optional(),
    collation: z.boolean().nullish(),
    colorModes: z
      .array(z.union([microsoft_graph_printColorMode, z.object({}).partial().passthrough()]))
      .optional(),
    contentTypes: z.array(z.string().nullable()).optional(),
    copiesPerJob: z
      .union([microsoft_graph_integerRange, z.object({}).partial().passthrough()])
      .optional(),
    dpis: z.array(z.number().gte(-2147483648).lte(2147483647).nullable()).optional(),
    duplexModes: z
      .array(z.union([microsoft_graph_printDuplexMode, z.object({}).partial().passthrough()]))
      .optional(),
    feedOrientations: z
      .array(
        z.union([microsoft_graph_printerFeedOrientation, z.object({}).partial().passthrough()])
      )
      .optional(),
    finishings: z
      .array(z.union([microsoft_graph_printFinishing, z.object({}).partial().passthrough()]))
      .optional(),
    inputBins: z.array(z.string().nullable()).optional(),
    isColorPrintingSupported: z.boolean().nullish(),
    isPageRangeSupported: z.boolean().nullish(),
    leftMargins: z.array(z.number().gte(-2147483648).lte(2147483647).nullable()).optional(),
    mediaColors: z.array(z.string().nullable()).optional(),
    mediaSizes: z.array(z.string().nullable()).optional(),
    mediaTypes: z.array(z.string().nullable()).optional(),
    multipageLayouts: z
      .array(z.union([microsoft_graph_printMultipageLayout, z.object({}).partial().passthrough()]))
      .optional(),
    orientations: z
      .array(z.union([microsoft_graph_printOrientation, z.object({}).partial().passthrough()]))
      .optional(),
    outputBins: z.array(z.string().nullable()).optional(),
    pagesPerSheet: z.array(z.number().gte(-2147483648).lte(2147483647).nullable()).optional(),
    qualities: z
      .array(z.union([microsoft_graph_printQuality, z.object({}).partial().passthrough()]))
      .optional(),
    rightMargins: z.array(z.number().gte(-2147483648).lte(2147483647).nullable()).optional(),
    scalings: z
      .array(z.union([microsoft_graph_printScaling, z.object({}).partial().passthrough()]))
      .optional(),
    supportsFitPdfToPage: z.boolean().nullish(),
    topMargins: z.array(z.number().gte(-2147483648).lte(2147483647).nullable()).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_printerDefaults = z
  .object({
    colorMode: z
      .union([microsoft_graph_printColorMode, z.object({}).partial().passthrough()])
      .optional(),
    contentType: z.string().nullish(),
    copiesPerJob: z.number().gte(-2147483648).lte(2147483647).nullish(),
    dpi: z.number().gte(-2147483648).lte(2147483647).nullish(),
    duplexMode: z
      .union([microsoft_graph_printDuplexMode, z.object({}).partial().passthrough()])
      .optional(),
    finishings: z
      .array(z.union([microsoft_graph_printFinishing, z.object({}).partial().passthrough()]))
      .optional(),
    fitPdfToPage: z.boolean().nullish(),
    inputBin: z.string().nullish(),
    mediaColor: z.string().nullish(),
    mediaSize: z.string().nullish(),
    mediaType: z.string().nullish(),
    multipageLayout: z
      .union([microsoft_graph_printMultipageLayout, z.object({}).partial().passthrough()])
      .optional(),
    orientation: z
      .union([microsoft_graph_printOrientation, z.object({}).partial().passthrough()])
      .optional(),
    outputBin: z.string().nullish(),
    pagesPerSheet: z.number().gte(-2147483648).lte(2147483647).nullish(),
    quality: z
      .union([microsoft_graph_printQuality, z.object({}).partial().passthrough()])
      .optional(),
    scaling: z
      .union([microsoft_graph_printScaling, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const ReferenceNumeric = z.enum(['-INF', 'INF', 'NaN']);
const microsoft_graph_printerLocation = z
  .object({
    altitudeInMeters: z.number().gte(-2147483648).lte(2147483647).nullish(),
    building: z.string().nullish(),
    city: z.string().nullish(),
    countryOrRegion: z.string().nullish(),
    floor: z.string().nullish(),
    floorDescription: z.string().nullish(),
    latitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    longitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    organization: z.array(z.string().nullable()).optional(),
    postalCode: z.string().nullish(),
    roomDescription: z.string().nullish(),
    roomName: z.string().nullish(),
    site: z.string().nullish(),
    stateOrProvince: z.string().nullish(),
    streetAddress: z.string().nullish(),
    subdivision: z.array(z.string().nullable()).optional(),
    subunit: z.array(z.string().nullable()).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    description: z.string().nullish(),
    details: z.array(microsoft_graph_printerProcessingStateDetail).optional(),
    state: microsoft_graph_printerProcessingState.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_printMargin = z
  .object({
    bottom: z.number().gte(-2147483648).lte(2147483647).nullish(),
    left: z.number().gte(-2147483648).lte(2147483647).nullish(),
    right: z.number().gte(-2147483648).lte(2147483647).nullish(),
    top: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_printJobConfiguration = z
  .object({
    collate: z.boolean().nullish(),
    colorMode: z
      .union([microsoft_graph_printColorMode, z.object({}).partial().passthrough()])
      .optional(),
    copies: z.number().gte(-2147483648).lte(2147483647).nullish(),
    dpi: z.number().gte(-2147483648).lte(2147483647).nullish(),
    duplexMode: z
      .union([microsoft_graph_printDuplexMode, z.object({}).partial().passthrough()])
      .optional(),
    feedOrientation: z
      .union([microsoft_graph_printerFeedOrientation, z.object({}).partial().passthrough()])
      .optional(),
    finishings: z
      .array(z.union([microsoft_graph_printFinishing, z.object({}).partial().passthrough()]))
      .optional(),
    fitPdfToPage: z.boolean().nullish(),
    inputBin: z.string().nullish(),
    margin: z.union([microsoft_graph_printMargin, z.object({}).partial().passthrough()]).optional(),
    mediaSize: z.string().nullish(),
    mediaType: z.string().nullish(),
    multipageLayout: z
      .union([microsoft_graph_printMultipageLayout, z.object({}).partial().passthrough()])
      .optional(),
    orientation: z
      .union([microsoft_graph_printOrientation, z.object({}).partial().passthrough()])
      .optional(),
    outputBin: z.string().nullish(),
    pageRanges: z.array(microsoft_graph_integerRange).optional(),
    pagesPerSheet: z.number().gte(-2147483648).lte(2147483647).nullish(),
    quality: z
      .union([microsoft_graph_printQuality, z.object({}).partial().passthrough()])
      .optional(),
    scaling: z
      .union([microsoft_graph_printScaling, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_userIdentity = microsoft_graph_identity.and(
  z
    .object({
      ipAddress: z.string().nullish(),
      userPrincipalName: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.userIdentity'),
    })
    .passthrough()
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
    description: z.string().optional(),
    details: z.array(microsoft_graph_printJobStateDetail).optional(),
    isAcquiredByPrinter: z.boolean().optional(),
    state: microsoft_graph_printJobProcessingState.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_printDocument = microsoft_graph_entity.and(
  z
    .object({
      contentType: z.string().nullish(),
      displayName: z.string().nullish(),
      downloadedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      size: z.number().optional(),
      uploadedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
    description: z.string().optional(),
    state: microsoft_graph_printTaskProcessingState.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_appIdentity = z
  .object({
    appId: z.string().nullish(),
    displayName: z.string().nullish(),
    servicePrincipalId: z.string().nullish(),
    servicePrincipalName: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_printTaskDefinition: z.ZodType<microsoft_graph_printTaskDefinition> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          createdBy: microsoft_graph_appIdentity.optional(),
          displayName: z.string().optional(),
          tasks: z.array(microsoft_graph_printTask).optional(),
          '@odata.type': z.string(),
        })
        .passthrough()
    )
);
const microsoft_graph_printEvent = z.enum(['jobStarted', 'unknownFutureValue']);
const microsoft_graph_printTaskTrigger: z.ZodType<microsoft_graph_printTaskTrigger> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        event: microsoft_graph_printEvent.optional(),
        definition: microsoft_graph_printTaskDefinition.optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_printTask: z.ZodType<microsoft_graph_printTask> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        parentUrl: z.string().optional(),
        status: microsoft_graph_printTaskStatus.optional(),
        definition: microsoft_graph_printTaskDefinition.optional(),
        trigger: microsoft_graph_printTaskTrigger.optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
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
        .nullish(),
      configuration: microsoft_graph_printJobConfiguration.optional(),
      createdBy: z
        .union([microsoft_graph_userIdentity, z.object({}).partial().passthrough()])
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      errorCode: z.number().gte(-2147483648).lte(2147483647).nullish(),
      isFetchable: z.boolean().optional(),
      redirectedFrom: z.string().nullish(),
      redirectedTo: z.string().nullish(),
      status: microsoft_graph_printJobStatus.optional(),
      documents: z.array(microsoft_graph_printDocument).optional(),
      tasks: z.array(microsoft_graph_printTask).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_printerBase = microsoft_graph_entity.and(
  z
    .object({
      capabilities: z
        .union([microsoft_graph_printerCapabilities, z.object({}).partial().passthrough()])
        .optional(),
      defaults: z
        .union([microsoft_graph_printerDefaults, z.object({}).partial().passthrough()])
        .optional(),
      displayName: z.string().optional(),
      isAcceptingJobs: z.boolean().nullish(),
      location: z
        .union([microsoft_graph_printerLocation, z.object({}).partial().passthrough()])
        .optional(),
      manufacturer: z.string().nullish(),
      model: z.string().nullish(),
      status: microsoft_graph_printerStatus.optional(),
      jobs: z.array(microsoft_graph_printJob).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_printerShareViewpoint = z
  .object({
    lastUsedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_assignedLabel = z
  .object({
    displayName: z.string().nullish(),
    labelId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_licenseProcessingState = z
  .object({ state: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_serviceProvisioningError = z
  .object({
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    isResolved: z.boolean().nullish(),
    serviceInstance: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_appRoleAssignment = microsoft_graph_directoryObject.and(
  z
    .object({
      appRoleId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      principalDisplayName: z.string().nullish(),
      principalId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .nullish(),
      principalType: z.string().nullish(),
      resourceDisplayName: z.string().nullish(),
      resourceId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .nullish(),
      '@odata.type': z.string().default('#microsoft.graph.appRoleAssignment'),
    })
    .passthrough()
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
  .object({ address: z.string().nullish(), name: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
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
        .array(z.union([microsoft_graph_calendarRoleType, z.object({}).partial().passthrough()]))
        .optional(),
      emailAddress: z
        .union([microsoft_graph_emailAddress, z.object({}).partial().passthrough()])
        .optional(),
      isInsideOrganization: z.boolean().nullish(),
      isRemovable: z.boolean().nullish(),
      role: z
        .union([microsoft_graph_calendarRoleType, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_outlookItem = microsoft_graph_entity.and(
  z
    .object({
      categories: z.array(z.string().nullable()).optional(),
      changeKey: z.string().nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_recipient = z
  .object({
    emailAddress: z
      .union([microsoft_graph_emailAddress, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_attendeeType = z.enum(['required', 'optional', 'resource']);
const microsoft_graph_attendeeBase = microsoft_graph_recipient.and(
  z
    .object({
      type: z
        .union([microsoft_graph_attendeeType, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.attendeeBase'),
    })
    .passthrough()
);
const microsoft_graph_timeSlot = z
  .object({
    end: microsoft_graph_dateTimeTimeZone.optional(),
    start: microsoft_graph_dateTimeTimeZone.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
      .union([microsoft_graph_responseType, z.object({}).partial().passthrough()])
      .optional(),
    time: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_attendee = microsoft_graph_attendeeBase.and(
  z
    .object({
      proposedNewTime: z
        .union([microsoft_graph_timeSlot, z.object({}).partial().passthrough()])
        .optional(),
      status: z
        .union([microsoft_graph_responseStatus, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.attendee'),
    })
    .passthrough()
);
const microsoft_graph_bodyType = z.enum(['text', 'html']);
const microsoft_graph_itemBody = z
  .object({
    content: z.string().nullish(),
    contentType: z
      .union([microsoft_graph_bodyType, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_importance = z.enum(['low', 'normal', 'high']);
const microsoft_graph_physicalAddress = z
  .object({
    city: z.string().nullish(),
    countryOrRegion: z.string().nullish(),
    postalCode: z.string().nullish(),
    state: z.string().nullish(),
    street: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_outlookGeoCoordinates = z
  .object({
    accuracy: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    altitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    altitudeAccuracy: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    latitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    longitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
      .union([microsoft_graph_physicalAddress, z.object({}).partial().passthrough()])
      .optional(),
    coordinates: z
      .union([microsoft_graph_outlookGeoCoordinates, z.object({}).partial().passthrough()])
      .optional(),
    displayName: z.string().nullish(),
    locationEmailAddress: z.string().nullish(),
    locationType: z
      .union([microsoft_graph_locationType, z.object({}).partial().passthrough()])
      .optional(),
    locationUri: z.string().nullish(),
    uniqueId: z.string().nullish(),
    uniqueIdType: z
      .union([microsoft_graph_locationUniqueIdType, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    language: z.string().nullish(),
    number: z.string().nullish(),
    region: z.string().nullish(),
    type: z.union([microsoft_graph_phoneType, z.object({}).partial().passthrough()]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_onlineMeetingInfo = z
  .object({
    conferenceId: z.string().nullish(),
    joinUrl: z.string().nullish(),
    phones: z.array(microsoft_graph_phone).optional(),
    quickDial: z.string().nullish(),
    tollFreeNumbers: z.array(z.string().nullable()).optional(),
    tollNumber: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    dayOfMonth: z.number().gte(-2147483648).lte(2147483647).optional(),
    daysOfWeek: z
      .array(z.union([microsoft_graph_dayOfWeek, z.object({}).partial().passthrough()]))
      .optional(),
    firstDayOfWeek: z
      .union([microsoft_graph_dayOfWeek, z.object({}).partial().passthrough()])
      .optional(),
    index: z.union([microsoft_graph_weekIndex, z.object({}).partial().passthrough()]).optional(),
    interval: z.number().gte(-2147483648).lte(2147483647).optional(),
    month: z.number().gte(-2147483648).lte(2147483647).optional(),
    type: z
      .union([microsoft_graph_recurrencePatternType, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_recurrenceRangeType = z.enum(['endDate', 'noEnd', 'numbered']);
const microsoft_graph_recurrenceRange = z
  .object({
    endDate: z
      .string()
      .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
      .nullish(),
    numberOfOccurrences: z.number().gte(-2147483648).lte(2147483647).optional(),
    recurrenceTimeZone: z.string().nullish(),
    startDate: z
      .string()
      .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
      .nullish(),
    type: z
      .union([microsoft_graph_recurrenceRangeType, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_patternedRecurrence = z
  .object({
    pattern: z
      .union([microsoft_graph_recurrencePattern, z.object({}).partial().passthrough()])
      .optional(),
    range: z
      .union([microsoft_graph_recurrenceRange, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
      contentType: z.string().nullish(),
      isInline: z.boolean().optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      name: z.string().nullish(),
      size: z.number().gte(-2147483648).lte(2147483647).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_extension = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_multiValueLegacyExtendedProperty = microsoft_graph_entity.and(
  z
    .object({ value: z.array(z.string().nullable()).optional(), '@odata.type': z.string() })
    .passthrough()
);
const microsoft_graph_singleValueLegacyExtendedProperty = microsoft_graph_entity.and(
  z.object({ value: z.string().nullish(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_event: z.ZodType<microsoft_graph_event> = z.lazy(() =>
  microsoft_graph_outlookItem.and(
    z
      .object({
        allowNewTimeProposals: z.boolean().nullish(),
        attendees: z.array(microsoft_graph_attendee).optional(),
        body: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
        bodyPreview: z.string().nullish(),
        cancelledOccurrences: z.array(z.string()).optional(),
        end: z
          .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
          .optional(),
        hasAttachments: z.boolean().nullish(),
        hideAttendees: z.boolean().nullish(),
        iCalUId: z.string().nullish(),
        importance: z
          .union([microsoft_graph_importance, z.object({}).partial().passthrough()])
          .optional(),
        isAllDay: z.boolean().nullish(),
        isCancelled: z.boolean().nullish(),
        isDraft: z.boolean().nullish(),
        isOnlineMeeting: z.boolean().nullish(),
        isOrganizer: z.boolean().nullish(),
        isReminderOn: z.boolean().nullish(),
        location: z
          .union([microsoft_graph_location, z.object({}).partial().passthrough()])
          .optional(),
        locations: z.array(microsoft_graph_location).optional(),
        onlineMeeting: z
          .union([microsoft_graph_onlineMeetingInfo, z.object({}).partial().passthrough()])
          .optional(),
        onlineMeetingProvider: z
          .union([microsoft_graph_onlineMeetingProviderType, z.object({}).partial().passthrough()])
          .optional(),
        onlineMeetingUrl: z.string().nullish(),
        organizer: z
          .union([microsoft_graph_recipient, z.object({}).partial().passthrough()])
          .optional(),
        originalEndTimeZone: z.string().nullish(),
        originalStart: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        originalStartTimeZone: z.string().nullish(),
        recurrence: z
          .union([microsoft_graph_patternedRecurrence, z.object({}).partial().passthrough()])
          .optional(),
        reminderMinutesBeforeStart: z.number().gte(-2147483648).lte(2147483647).nullish(),
        responseRequested: z.boolean().nullish(),
        responseStatus: z
          .union([microsoft_graph_responseStatus, z.object({}).partial().passthrough()])
          .optional(),
        sensitivity: z
          .union([microsoft_graph_sensitivity, z.object({}).partial().passthrough()])
          .optional(),
        seriesMasterId: z.string().nullish(),
        showAs: z
          .union([microsoft_graph_freeBusyStatus, z.object({}).partial().passthrough()])
          .optional(),
        start: z
          .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
          .optional(),
        subject: z.string().nullish(),
        transactionId: z.string().nullish(),
        type: z.union([microsoft_graph_eventType, z.object({}).partial().passthrough()]).optional(),
        webLink: z.string().nullish(),
        attachments: z.array(microsoft_graph_attachment).optional(),
        calendar: z
          .union([microsoft_graph_calendar, z.object({}).partial().passthrough()])
          .optional(),
        exceptionOccurrences: z.array(microsoft_graph_event).optional(),
        extensions: z.array(microsoft_graph_extension).optional(),
        instances: z.array(microsoft_graph_event).optional(),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .optional(),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .optional(),
        '@odata.type': z.string().default('#microsoft.graph.event'),
      })
      .passthrough()
  )
);
const microsoft_graph_calendar: z.ZodType<microsoft_graph_calendar> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        allowedOnlineMeetingProviders: z
          .array(
            z.union([
              microsoft_graph_onlineMeetingProviderType,
              z.object({}).partial().passthrough(),
            ])
          )
          .optional(),
        canEdit: z.boolean().nullish(),
        canShare: z.boolean().nullish(),
        canViewPrivateItems: z.boolean().nullish(),
        changeKey: z.string().nullish(),
        color: z
          .union([microsoft_graph_calendarColor, z.object({}).partial().passthrough()])
          .optional(),
        defaultOnlineMeetingProvider: z
          .union([microsoft_graph_onlineMeetingProviderType, z.object({}).partial().passthrough()])
          .optional(),
        hexColor: z.string().nullish(),
        isDefaultCalendar: z.boolean().nullish(),
        isRemovable: z.boolean().nullish(),
        isTallyingResponses: z.boolean().nullish(),
        name: z.string().nullish(),
        owner: z
          .union([microsoft_graph_emailAddress, z.object({}).partial().passthrough()])
          .optional(),
        calendarPermissions: z.array(microsoft_graph_calendarPermission).optional(),
        calendarView: z.array(microsoft_graph_event).optional(),
        events: z.array(microsoft_graph_event).optional(),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .optional(),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_post: z.ZodType<microsoft_graph_post> = z.lazy(() =>
  microsoft_graph_outlookItem.and(
    z
      .object({
        body: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
        conversationId: z.string().nullish(),
        conversationThreadId: z.string().nullish(),
        from: microsoft_graph_recipient.optional(),
        hasAttachments: z.boolean().optional(),
        newParticipants: z.array(microsoft_graph_recipient).optional(),
        receivedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        sender: z
          .union([microsoft_graph_recipient, z.object({}).partial().passthrough()])
          .optional(),
        attachments: z.array(microsoft_graph_attachment).optional(),
        extensions: z.array(microsoft_graph_extension).optional(),
        inReplyTo: z.union([microsoft_graph_post, z.object({}).partial().passthrough()]).optional(),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .optional(),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .optional(),
        '@odata.type': z.string().default('#microsoft.graph.post'),
      })
      .passthrough()
  )
);
const microsoft_graph_conversationThread = microsoft_graph_entity.and(
  z
    .object({
      ccRecipients: z.array(microsoft_graph_recipient).optional(),
      hasAttachments: z.boolean().optional(),
      isLocked: z.boolean().optional(),
      lastDeliveredDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      preview: z.string().optional(),
      topic: z.string().optional(),
      toRecipients: z.array(microsoft_graph_recipient).optional(),
      uniqueSenders: z.array(z.string()).optional(),
      posts: z.array(microsoft_graph_post).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_conversation = microsoft_graph_entity.and(
  z
    .object({
      hasAttachments: z.boolean().optional(),
      lastDeliveredDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      preview: z.string().optional(),
      topic: z.string().optional(),
      uniqueSenders: z.array(z.string()).optional(),
      threads: z.array(microsoft_graph_conversationThread).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_groupLifecyclePolicy = microsoft_graph_entity.and(
  z
    .object({
      alternateNotificationEmails: z.string().nullish(),
      groupLifetimeInDays: z.number().gte(-2147483648).lte(2147483647).nullish(),
      managedGroupTypes: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_onenoteEntityBaseModel = microsoft_graph_entity.and(
  z.object({ self: z.string().nullish(), '@odata.type': z.string() }).passthrough()
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
        .nullish(),
      '@odata.type': z.string().default('#microsoft.graph.onenoteEntitySchemaObjectModel'),
    })
    .passthrough()
);
const microsoft_graph_onenoteEntityHierarchyModel =
  microsoft_graph_onenoteEntitySchemaObjectModel.and(
    z
      .object({
        createdBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
          .optional(),
        displayName: z.string().nullish(),
        lastModifiedBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
          .optional(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        '@odata.type': z.string().default('#microsoft.graph.onenoteEntityHierarchyModel'),
      })
      .passthrough()
  );
const microsoft_graph_externalLink = z
  .object({ href: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_notebookLinks = z
  .object({
    oneNoteClientUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().passthrough()])
      .optional(),
    oneNoteWebUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_onenoteUserRole = z.enum(['None', 'Owner', 'Contributor', 'Reader']);
const microsoft_graph_sectionLinks = z
  .object({
    oneNoteClientUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().passthrough()])
      .optional(),
    oneNoteWebUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_pageLinks = z
  .object({
    oneNoteClientUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().passthrough()])
      .optional(),
    oneNoteWebUrl: z
      .union([microsoft_graph_externalLink, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_onenotePage: z.ZodType<microsoft_graph_onenotePage> = z.lazy(() =>
  microsoft_graph_onenoteEntitySchemaObjectModel.and(
    z
      .object({
        content: z.string().nullish(),
        contentUrl: z.string().nullish(),
        createdByAppId: z.string().nullish(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        level: z.number().gte(-2147483648).lte(2147483647).nullish(),
        links: z
          .union([microsoft_graph_pageLinks, z.object({}).partial().passthrough()])
          .optional(),
        order: z.number().gte(-2147483648).lte(2147483647).nullish(),
        title: z.string().nullish(),
        userTags: z.array(z.string().nullable()).optional(),
        parentNotebook: z
          .union([microsoft_graph_notebook, z.object({}).partial().passthrough()])
          .optional(),
        parentSection: z
          .union([microsoft_graph_onenoteSection, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string().default('#microsoft.graph.onenotePage'),
      })
      .passthrough()
  )
);
const microsoft_graph_onenoteSection: z.ZodType<microsoft_graph_onenoteSection> = z.lazy(() =>
  microsoft_graph_onenoteEntityHierarchyModel.and(
    z
      .object({
        isDefault: z.boolean().nullish(),
        links: z
          .union([microsoft_graph_sectionLinks, z.object({}).partial().passthrough()])
          .optional(),
        pagesUrl: z.string().nullish(),
        pages: z.array(microsoft_graph_onenotePage).optional(),
        parentNotebook: z
          .union([microsoft_graph_notebook, z.object({}).partial().passthrough()])
          .optional(),
        parentSectionGroup: z
          .union([microsoft_graph_sectionGroup, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string().default('#microsoft.graph.onenoteSection'),
      })
      .passthrough()
  )
);
const microsoft_graph_sectionGroup: z.ZodType<microsoft_graph_sectionGroup> = z.lazy(() =>
  microsoft_graph_onenoteEntityHierarchyModel.and(
    z
      .object({
        sectionGroupsUrl: z.string().nullish(),
        sectionsUrl: z.string().nullish(),
        parentNotebook: z
          .union([microsoft_graph_notebook, z.object({}).partial().passthrough()])
          .optional(),
        parentSectionGroup: z
          .union([microsoft_graph_sectionGroup, z.object({}).partial().passthrough()])
          .optional(),
        sectionGroups: z.array(microsoft_graph_sectionGroup).optional(),
        sections: z.array(microsoft_graph_onenoteSection).optional(),
        '@odata.type': z.string().default('#microsoft.graph.sectionGroup'),
      })
      .passthrough()
  )
);
const microsoft_graph_notebook: z.ZodType<microsoft_graph_notebook> = z.lazy(() =>
  microsoft_graph_onenoteEntityHierarchyModel.and(
    z
      .object({
        isDefault: z.boolean().nullish(),
        isShared: z.boolean().nullish(),
        links: z
          .union([microsoft_graph_notebookLinks, z.object({}).partial().passthrough()])
          .optional(),
        sectionGroupsUrl: z.string().nullish(),
        sectionsUrl: z.string().nullish(),
        userRole: z
          .union([microsoft_graph_onenoteUserRole, z.object({}).partial().passthrough()])
          .optional(),
        sectionGroups: z.array(microsoft_graph_sectionGroup).optional(),
        sections: z.array(microsoft_graph_onenoteSection).optional(),
        '@odata.type': z.string().default('#microsoft.graph.notebook'),
      })
      .passthrough()
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
        .nullish(),
      lastActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      status: z
        .union([microsoft_graph_operationStatus, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_onenoteOperationError = z
  .object({ code: z.string().nullish(), message: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_onenoteOperation = microsoft_graph_operation.and(
  z
    .object({
      error: z
        .union([microsoft_graph_onenoteOperationError, z.object({}).partial().passthrough()])
        .optional(),
      percentComplete: z.string().nullish(),
      resourceId: z.string().nullish(),
      resourceLocation: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_onenoteResource = microsoft_graph_onenoteEntityBaseModel.and(
  z
    .object({
      content: z.string().nullish(),
      contentUrl: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.onenoteResource'),
    })
    .passthrough()
);
const microsoft_graph_onenote = microsoft_graph_entity.and(
  z
    .object({
      notebooks: z.array(microsoft_graph_notebook).optional(),
      operations: z.array(microsoft_graph_onenoteOperation).optional(),
      pages: z.array(microsoft_graph_onenotePage).optional(),
      resources: z.array(microsoft_graph_onenoteResource).optional(),
      sectionGroups: z.array(microsoft_graph_sectionGroup).optional(),
      sections: z.array(microsoft_graph_onenoteSection).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_resourceSpecificPermissionGrant = microsoft_graph_directoryObject.and(
  z
    .object({
      clientAppId: z.string().nullish(),
      clientId: z.string().nullish(),
      permission: z.string().nullish(),
      permissionType: z.string().nullish(),
      resourceAppId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.resourceSpecificPermissionGrant'),
    })
    .passthrough()
);
const microsoft_graph_profilePhoto = microsoft_graph_entity.and(
  z
    .object({
      height: z.number().gte(-2147483648).lte(2147483647).nullish(),
      width: z.number().gte(-2147483648).lte(2147483647).nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerContainerType = z.enum(['group', 'unknownFutureValue', 'roster']);
const microsoft_graph_plannerPlanContainer = z
  .object({
    containerId: z.string().nullish(),
    type: z
      .union([microsoft_graph_plannerContainerType, z.object({}).partial().passthrough()])
      .optional(),
    url: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_plannerAppliedCategories = z
  .object({ '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_plannerAssignments = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_plannerPreviewType = z.enum([
  'automatic',
  'noPreview',
  'checklist',
  'description',
  'reference',
]);
const microsoft_graph_plannerOrderHintsByAssignee = z
  .object({ '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_plannerAssignedToTaskBoardTaskFormat = microsoft_graph_entity.and(
  z
    .object({
      orderHintsByAssignee: z
        .union([microsoft_graph_plannerOrderHintsByAssignee, z.object({}).partial().passthrough()])
        .optional(),
      unassignedOrderHint: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerBucketTaskBoardTaskFormat = microsoft_graph_entity.and(
  z.object({ orderHint: z.string().nullish(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_plannerChecklistItems = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_plannerExternalReferences = z
  .object({ '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_plannerTaskDetails = microsoft_graph_entity.and(
  z
    .object({
      checklist: z
        .union([microsoft_graph_plannerChecklistItems, z.object({}).partial().passthrough()])
        .optional(),
      description: z.string().nullish(),
      previewType: z
        .union([microsoft_graph_plannerPreviewType, z.object({}).partial().passthrough()])
        .optional(),
      references: z
        .union([microsoft_graph_plannerExternalReferences, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerProgressTaskBoardTaskFormat = microsoft_graph_entity.and(
  z.object({ orderHint: z.string().nullish(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_plannerTask = microsoft_graph_entity.and(
  z
    .object({
      activeChecklistItemCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
      appliedCategories: z
        .union([microsoft_graph_plannerAppliedCategories, z.object({}).partial().passthrough()])
        .optional(),
      assigneePriority: z.string().nullish(),
      assignments: z
        .union([microsoft_graph_plannerAssignments, z.object({}).partial().passthrough()])
        .optional(),
      bucketId: z.string().nullish(),
      checklistItemCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
      completedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      completedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      conversationThreadId: z.string().nullish(),
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      dueDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      hasDescription: z.boolean().nullish(),
      orderHint: z.string().nullish(),
      percentComplete: z.number().gte(-2147483648).lte(2147483647).nullish(),
      planId: z.string().nullish(),
      previewType: z
        .union([microsoft_graph_plannerPreviewType, z.object({}).partial().passthrough()])
        .optional(),
      priority: z.number().gte(-2147483648).lte(2147483647).nullish(),
      referenceCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
      startDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      title: z.string().optional(),
      assignedToTaskBoardFormat: z
        .union([
          microsoft_graph_plannerAssignedToTaskBoardTaskFormat,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      bucketTaskBoardFormat: z
        .union([
          microsoft_graph_plannerBucketTaskBoardTaskFormat,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      details: z
        .union([microsoft_graph_plannerTaskDetails, z.object({}).partial().passthrough()])
        .optional(),
      progressTaskBoardFormat: z
        .union([
          microsoft_graph_plannerProgressTaskBoardTaskFormat,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerBucket = microsoft_graph_entity.and(
  z
    .object({
      name: z.string().optional(),
      orderHint: z.string().nullish(),
      planId: z.string().nullish(),
      tasks: z.array(microsoft_graph_plannerTask).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerCategoryDescriptions = z
  .object({
    category1: z.string().nullish(),
    category10: z.string().nullish(),
    category11: z.string().nullish(),
    category12: z.string().nullish(),
    category13: z.string().nullish(),
    category14: z.string().nullish(),
    category15: z.string().nullish(),
    category16: z.string().nullish(),
    category17: z.string().nullish(),
    category18: z.string().nullish(),
    category19: z.string().nullish(),
    category2: z.string().nullish(),
    category20: z.string().nullish(),
    category21: z.string().nullish(),
    category22: z.string().nullish(),
    category23: z.string().nullish(),
    category24: z.string().nullish(),
    category25: z.string().nullish(),
    category3: z.string().nullish(),
    category4: z.string().nullish(),
    category5: z.string().nullish(),
    category6: z.string().nullish(),
    category7: z.string().nullish(),
    category8: z.string().nullish(),
    category9: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_plannerUserIds = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_plannerPlanDetails = microsoft_graph_entity.and(
  z
    .object({
      categoryDescriptions: z
        .union([microsoft_graph_plannerCategoryDescriptions, z.object({}).partial().passthrough()])
        .optional(),
      sharedWith: z
        .union([microsoft_graph_plannerUserIds, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerPlan = microsoft_graph_entity.and(
  z
    .object({
      container: z
        .union([microsoft_graph_plannerPlanContainer, z.object({}).partial().passthrough()])
        .optional(),
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      owner: z.string().nullish(),
      title: z.string().optional(),
      buckets: z.array(microsoft_graph_plannerBucket).optional(),
      details: z
        .union([microsoft_graph_plannerPlanDetails, z.object({}).partial().passthrough()])
        .optional(),
      tasks: z.array(microsoft_graph_plannerTask).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerGroup = microsoft_graph_entity.and(
  z
    .object({ plans: z.array(microsoft_graph_plannerPlan).optional(), '@odata.type': z.string() })
    .passthrough()
);
const microsoft_graph_settingValue = z
  .object({ name: z.string().nullish(), value: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_groupSetting = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      templateId: z.string().nullish(),
      values: z.array(microsoft_graph_settingValue).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_publicErrorDetail = z
  .object({
    code: z.string().nullish(),
    message: z.string().nullish(),
    target: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_publicInnerError = z
  .object({
    code: z.string().nullish(),
    details: z.array(microsoft_graph_publicErrorDetail).optional(),
    message: z.string().nullish(),
    target: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_publicError = z
  .object({
    code: z.string().nullish(),
    details: z.array(microsoft_graph_publicErrorDetail).optional(),
    innerError: z
      .union([microsoft_graph_publicInnerError, z.object({}).partial().passthrough()])
      .optional(),
    message: z.string().nullish(),
    target: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_root = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_siteArchiveStatus = z.enum([
  'recentlyArchived',
  'fullyArchived',
  'reactivating',
  'unknownFutureValue',
]);
const microsoft_graph_siteArchivalDetails = z
  .object({
    archiveStatus: z
      .union([microsoft_graph_siteArchiveStatus, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_siteCollection = z
  .object({
    archivalDetails: z
      .union([microsoft_graph_siteArchivalDetails, z.object({}).partial().passthrough()])
      .optional(),
    dataLocationCode: z.string().nullish(),
    hostname: z.string().nullish(),
    root: z.union([microsoft_graph_root, z.object({}).partial().passthrough()]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_itemActionStat = z
  .object({
    actionCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    actorCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_incompleteData = z
  .object({
    missingDataBeforeDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    wasThrottled: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_accessAction = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_audio = z
  .object({
    album: z.string().nullish(),
    albumArtist: z.string().nullish(),
    artist: z.string().nullish(),
    bitrate: z.number().nullish(),
    composers: z.string().nullish(),
    copyright: z.string().nullish(),
    disc: z.number().gte(-32768).lte(32767).nullish(),
    discCount: z.number().gte(-32768).lte(32767).nullish(),
    duration: z.number().nullish(),
    genre: z.string().nullish(),
    hasDrm: z.boolean().nullish(),
    isVariableBitrate: z.boolean().nullish(),
    title: z.string().nullish(),
    track: z.number().gte(-2147483648).lte(2147483647).nullish(),
    trackCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    year: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_album = z
  .object({ coverImageItemId: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_bundle = z
  .object({
    album: z.union([microsoft_graph_album, z.object({}).partial().passthrough()]).optional(),
    childCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_deleted = z
  .object({ state: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_hashes = z
  .object({
    crc32Hash: z.string().nullish(),
    quickXorHash: z.string().nullish(),
    sha1Hash: z.string().nullish(),
    sha256Hash: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_file = z
  .object({
    hashes: z.union([microsoft_graph_hashes, z.object({}).partial().passthrough()]).optional(),
    mimeType: z.string().nullish(),
    processingMetadata: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_fileSystemInfo = z
  .object({
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    lastAccessedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_folderView = z
  .object({
    sortBy: z.string().nullish(),
    sortOrder: z.string().nullish(),
    viewType: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_folder = z
  .object({
    childCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    view: z.union([microsoft_graph_folderView, z.object({}).partial().passthrough()]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_image = z
  .object({
    height: z.number().gte(-2147483648).lte(2147483647).nullish(),
    width: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_geoCoordinates = z
  .object({
    altitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    latitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    longitude: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_malware = z
  .object({ description: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_package = z
  .object({ type: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_pendingContentUpdate = z
  .object({
    queuedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_pendingOperations = z
  .object({
    pendingContentUpdate: z
      .union([microsoft_graph_pendingContentUpdate, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_photo = z
  .object({
    cameraMake: z.string().nullish(),
    cameraModel: z.string().nullish(),
    exposureDenominator: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    exposureNumerator: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    fNumber: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    focalLength: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    iso: z.number().gte(-2147483648).lte(2147483647).nullish(),
    orientation: z.number().gte(-32768).lte(32767).nullish(),
    takenDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_publicationFacet = z
  .object({
    checkedOutBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
      .optional(),
    level: z.string().nullish(),
    versionId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_shared = z
  .object({
    owner: z.union([microsoft_graph_identitySet, z.object({}).partial().passthrough()]).optional(),
    scope: z.string().nullish(),
    sharedBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
      .optional(),
    sharedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_specialFolder = z
  .object({ name: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_video = z
  .object({
    audioBitsPerSample: z.number().gte(-2147483648).lte(2147483647).nullish(),
    audioChannels: z.number().gte(-2147483648).lte(2147483647).nullish(),
    audioFormat: z.string().nullish(),
    audioSamplesPerSecond: z.number().gte(-2147483648).lte(2147483647).nullish(),
    bitrate: z.number().gte(-2147483648).lte(2147483647).nullish(),
    duration: z.number().nullish(),
    fourCC: z.string().nullish(),
    frameRate: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    height: z.number().gte(-2147483648).lte(2147483647).nullish(),
    width: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_remoteItem = z
  .object({
    createdBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
      .optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    file: z.union([microsoft_graph_file, z.object({}).partial().passthrough()]).optional(),
    fileSystemInfo: z
      .union([microsoft_graph_fileSystemInfo, z.object({}).partial().passthrough()])
      .optional(),
    folder: z.union([microsoft_graph_folder, z.object({}).partial().passthrough()]).optional(),
    id: z.string().nullish(),
    image: z.union([microsoft_graph_image, z.object({}).partial().passthrough()]).optional(),
    lastModifiedBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
      .optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    name: z.string().nullish(),
    package: z.union([microsoft_graph_package, z.object({}).partial().passthrough()]).optional(),
    parentReference: z
      .union([microsoft_graph_itemReference, z.object({}).partial().passthrough()])
      .optional(),
    shared: z.union([microsoft_graph_shared, z.object({}).partial().passthrough()]).optional(),
    sharepointIds: z
      .union([microsoft_graph_sharepointIds, z.object({}).partial().passthrough()])
      .optional(),
    size: z.number().nullish(),
    specialFolder: z
      .union([microsoft_graph_specialFolder, z.object({}).partial().passthrough()])
      .optional(),
    video: z.union([microsoft_graph_video, z.object({}).partial().passthrough()]).optional(),
    webDavUrl: z.string().nullish(),
    webUrl: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_searchResult = z
  .object({ onClickTelemetryUrl: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_contentTypeInfo = z
  .object({ id: z.string().nullish(), name: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_baseItemVersion = microsoft_graph_entity.and(
  z
    .object({
      lastModifiedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      publication: z
        .union([microsoft_graph_publicationFacet, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_fieldValueSet = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_listItemVersion = microsoft_graph_baseItemVersion.and(
  z
    .object({
      fields: z
        .union([microsoft_graph_fieldValueSet, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.listItemVersion'),
    })
    .passthrough()
);
const microsoft_graph_documentSetVersionItem = z
  .object({
    itemId: z.string().nullish(),
    title: z.string().nullish(),
    versionId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_documentSetVersion = microsoft_graph_listItemVersion.and(
  z
    .object({
      comment: z.string().nullish(),
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      items: z.array(microsoft_graph_documentSetVersionItem).optional(),
      shouldCaptureMinorVersion: z.boolean().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.documentSetVersion'),
    })
    .passthrough()
);
const microsoft_graph_listItem: z.ZodType<microsoft_graph_listItem> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        contentType: z
          .union([microsoft_graph_contentTypeInfo, z.object({}).partial().passthrough()])
          .optional(),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().passthrough()])
          .optional(),
        analytics: z
          .union([microsoft_graph_itemAnalytics, z.object({}).partial().passthrough()])
          .optional(),
        documentSetVersions: z.array(microsoft_graph_documentSetVersion).optional(),
        driveItem: z
          .union([microsoft_graph_driveItem, z.object({}).partial().passthrough()])
          .optional(),
        fields: z
          .union([microsoft_graph_fieldValueSet, z.object({}).partial().passthrough()])
          .optional(),
        versions: z.array(microsoft_graph_listItemVersion).optional(),
        '@odata.type': z.string().default('#microsoft.graph.listItem'),
      })
      .passthrough()
  )
);
const microsoft_graph_sharePointIdentity = microsoft_graph_identity.and(
  z
    .object({
      loginName: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.sharePointIdentity'),
    })
    .passthrough()
);
const microsoft_graph_sharePointIdentitySet = microsoft_graph_identitySet.and(
  z
    .object({
      group: z.union([microsoft_graph_identity, z.object({}).partial().passthrough()]).optional(),
      siteGroup: z
        .union([microsoft_graph_sharePointIdentity, z.object({}).partial().passthrough()])
        .optional(),
      siteUser: z
        .union([microsoft_graph_sharePointIdentity, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.sharePointIdentitySet'),
    })
    .passthrough()
);
const microsoft_graph_sharingInvitation = z
  .object({
    email: z.string().nullish(),
    invitedBy: z
      .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
      .optional(),
    redeemedBy: z.string().nullish(),
    signInRequired: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_sharingLink = z
  .object({
    application: z
      .union([microsoft_graph_identity, z.object({}).partial().passthrough()])
      .optional(),
    preventsDownload: z.boolean().nullish(),
    scope: z.string().nullish(),
    type: z.string().nullish(),
    webHtml: z.string().nullish(),
    webUrl: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_permission = microsoft_graph_entity.and(
  z
    .object({
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      grantedTo: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      grantedToIdentities: z.array(microsoft_graph_identitySet).optional(),
      grantedToIdentitiesV2: z.array(microsoft_graph_sharePointIdentitySet).optional(),
      grantedToV2: z
        .union([microsoft_graph_sharePointIdentitySet, z.object({}).partial().passthrough()])
        .optional(),
      hasPassword: z.boolean().nullish(),
      inheritedFrom: z
        .union([microsoft_graph_itemReference, z.object({}).partial().passthrough()])
        .optional(),
      invitation: z
        .union([microsoft_graph_sharingInvitation, z.object({}).partial().passthrough()])
        .optional(),
      link: z.union([microsoft_graph_sharingLink, z.object({}).partial().passthrough()]).optional(),
      roles: z.array(z.string().nullable()).optional(),
      shareId: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
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
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    isContentUpdateAllowed: z.boolean().nullish(),
    isDeleteAllowed: z.boolean().nullish(),
    isLabelUpdateAllowed: z.boolean().nullish(),
    isMetadataUpdateAllowed: z.boolean().nullish(),
    isRecordLocked: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_itemRetentionLabel = microsoft_graph_entity.and(
  z
    .object({
      isLabelAppliedExplicitly: z.boolean().nullish(),
      labelAppliedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      labelAppliedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      name: z.string().nullish(),
      retentionSettings: z
        .union([microsoft_graph_retentionLabelSettings, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_subscription = microsoft_graph_entity.and(
  z
    .object({
      applicationId: z.string().nullish(),
      changeType: z.string().optional(),
      clientState: z.string().nullish(),
      creatorId: z.string().nullish(),
      encryptionCertificate: z.string().nullish(),
      encryptionCertificateId: z.string().nullish(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      includeResourceData: z.boolean().nullish(),
      latestSupportedTlsVersion: z.string().nullish(),
      lifecycleNotificationUrl: z.string().nullish(),
      notificationQueryOptions: z.string().nullish(),
      notificationUrl: z.string().optional(),
      notificationUrlAppId: z.string().nullish(),
      resource: z.string().optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_thumbnail = z
  .object({
    content: z.string().nullish(),
    height: z.number().gte(-2147483648).lte(2147483647).nullish(),
    sourceItemId: z.string().nullish(),
    url: z.string().nullish(),
    width: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_thumbnailSet = microsoft_graph_entity.and(
  z
    .object({
      large: z.union([microsoft_graph_thumbnail, z.object({}).partial().passthrough()]).optional(),
      medium: z.union([microsoft_graph_thumbnail, z.object({}).partial().passthrough()]).optional(),
      small: z.union([microsoft_graph_thumbnail, z.object({}).partial().passthrough()]).optional(),
      source: z.union([microsoft_graph_thumbnail, z.object({}).partial().passthrough()]).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_driveItemVersion = microsoft_graph_baseItemVersion.and(
  z
    .object({
      content: z.string().nullish(),
      size: z.number().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.driveItemVersion'),
    })
    .passthrough()
);
const microsoft_graph_workbookApplication = microsoft_graph_entity.and(
  z.object({ calculationMode: z.string().optional(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_workbookCommentReply = microsoft_graph_entity.and(
  z
    .object({
      content: z.string().nullish(),
      contentType: z.string().optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookComment = microsoft_graph_entity.and(
  z
    .object({
      content: z.string().nullish(),
      contentType: z.string().optional(),
      replies: z.array(microsoft_graph_workbookCommentReply).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookFunctions = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_workbookChartFont = microsoft_graph_entity.and(
  z
    .object({
      bold: z.boolean().nullish(),
      color: z.string().nullish(),
      italic: z.boolean().nullish(),
      name: z.string().nullish(),
      size: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
      underline: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartLineFormat = microsoft_graph_entity.and(
  z.object({ color: z.string().nullish(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_workbookChartAxisFormat = microsoft_graph_entity.and(
  z
    .object({
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().passthrough()])
        .optional(),
      line: z
        .union([microsoft_graph_workbookChartLineFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartGridlinesFormat = microsoft_graph_entity.and(
  z
    .object({
      line: z
        .union([microsoft_graph_workbookChartLineFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartGridlines = microsoft_graph_entity.and(
  z
    .object({
      visible: z.boolean().optional(),
      format: z
        .union([microsoft_graph_workbookChartGridlinesFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartAxisTitleFormat = microsoft_graph_entity.and(
  z
    .object({
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartAxisTitle = microsoft_graph_entity.and(
  z
    .object({
      text: z.string().nullish(),
      visible: z.boolean().optional(),
      format: z
        .union([microsoft_graph_workbookChartAxisTitleFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartAxis = microsoft_graph_entity.and(
  z
    .object({
      majorUnit: z.unknown().optional(),
      maximum: z.unknown().optional(),
      minimum: z.unknown().optional(),
      minorUnit: z.unknown().optional(),
      format: z
        .union([microsoft_graph_workbookChartAxisFormat, z.object({}).partial().passthrough()])
        .optional(),
      majorGridlines: z
        .union([microsoft_graph_workbookChartGridlines, z.object({}).partial().passthrough()])
        .optional(),
      minorGridlines: z
        .union([microsoft_graph_workbookChartGridlines, z.object({}).partial().passthrough()])
        .optional(),
      title: z
        .union([microsoft_graph_workbookChartAxisTitle, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartAxes = microsoft_graph_entity.and(
  z
    .object({
      categoryAxis: z
        .union([microsoft_graph_workbookChartAxis, z.object({}).partial().passthrough()])
        .optional(),
      seriesAxis: z
        .union([microsoft_graph_workbookChartAxis, z.object({}).partial().passthrough()])
        .optional(),
      valueAxis: z
        .union([microsoft_graph_workbookChartAxis, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartFill = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_workbookChartDataLabelFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().passthrough()])
        .optional(),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartDataLabels = microsoft_graph_entity.and(
  z
    .object({
      position: z.string().nullish(),
      separator: z.string().nullish(),
      showBubbleSize: z.boolean().nullish(),
      showCategoryName: z.boolean().nullish(),
      showLegendKey: z.boolean().nullish(),
      showPercentage: z.boolean().nullish(),
      showSeriesName: z.boolean().nullish(),
      showValue: z.boolean().nullish(),
      format: z
        .union([microsoft_graph_workbookChartDataLabelFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartAreaFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().passthrough()])
        .optional(),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartLegendFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().passthrough()])
        .optional(),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartLegend = microsoft_graph_entity.and(
  z
    .object({
      overlay: z.boolean().nullish(),
      position: z.string().nullish(),
      visible: z.boolean().optional(),
      format: z
        .union([microsoft_graph_workbookChartLegendFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartSeriesFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().passthrough()])
        .optional(),
      line: z
        .union([microsoft_graph_workbookChartLineFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartPointFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartPoint = microsoft_graph_entity.and(
  z
    .object({
      value: z.unknown().optional(),
      format: z
        .union([microsoft_graph_workbookChartPointFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartSeries = microsoft_graph_entity.and(
  z
    .object({
      name: z.string().nullish(),
      format: z
        .union([microsoft_graph_workbookChartSeriesFormat, z.object({}).partial().passthrough()])
        .optional(),
      points: z.array(microsoft_graph_workbookChartPoint).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartTitleFormat = microsoft_graph_entity.and(
  z
    .object({
      fill: z
        .union([microsoft_graph_workbookChartFill, z.object({}).partial().passthrough()])
        .optional(),
      font: z
        .union([microsoft_graph_workbookChartFont, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChartTitle = microsoft_graph_entity.and(
  z
    .object({
      overlay: z.boolean().nullish(),
      text: z.string().nullish(),
      visible: z.boolean().optional(),
      format: z
        .union([microsoft_graph_workbookChartTitleFormat, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookChart: z.ZodType<microsoft_graph_workbookChart> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        height: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
        left: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
        name: z.string().nullish(),
        top: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
        width: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
        axes: z
          .union([microsoft_graph_workbookChartAxes, z.object({}).partial().passthrough()])
          .optional(),
        dataLabels: z
          .union([microsoft_graph_workbookChartDataLabels, z.object({}).partial().passthrough()])
          .optional(),
        format: z
          .union([microsoft_graph_workbookChartAreaFormat, z.object({}).partial().passthrough()])
          .optional(),
        legend: z
          .union([microsoft_graph_workbookChartLegend, z.object({}).partial().passthrough()])
          .optional(),
        series: z.array(microsoft_graph_workbookChartSeries).optional(),
        title: z
          .union([microsoft_graph_workbookChartTitle, z.object({}).partial().passthrough()])
          .optional(),
        worksheet: z
          .union([microsoft_graph_workbookWorksheet, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_workbookPivotTable: z.ZodType<microsoft_graph_workbookPivotTable> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          name: z.string().nullish(),
          worksheet: z
            .union([microsoft_graph_workbookWorksheet, z.object({}).partial().passthrough()])
            .optional(),
          '@odata.type': z.string(),
        })
        .passthrough()
    )
);
const microsoft_graph_workbookWorksheetProtectionOptions = z
  .object({
    allowAutoFilter: z.boolean().optional(),
    allowDeleteColumns: z.boolean().optional(),
    allowDeleteRows: z.boolean().optional(),
    allowFormatCells: z.boolean().optional(),
    allowFormatColumns: z.boolean().optional(),
    allowFormatRows: z.boolean().optional(),
    allowInsertColumns: z.boolean().optional(),
    allowInsertHyperlinks: z.boolean().optional(),
    allowInsertRows: z.boolean().optional(),
    allowPivotTables: z.boolean().optional(),
    allowSort: z.boolean().optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_workbookWorksheetProtection = microsoft_graph_entity.and(
  z
    .object({
      options: z
        .union([
          microsoft_graph_workbookWorksheetProtectionOptions,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      protected: z.boolean().optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookIcon = z
  .object({
    index: z.number().gte(-2147483648).lte(2147483647).optional(),
    set: z.string().optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_workbookFilterCriteria = z
  .object({
    color: z.string().nullish(),
    criterion1: z.string().nullish(),
    criterion2: z.string().nullish(),
    dynamicCriteria: z.string().optional(),
    filterOn: z.string().optional(),
    icon: z.union([microsoft_graph_workbookIcon, z.object({}).partial().passthrough()]).optional(),
    operator: z.string().optional(),
    values: z.unknown().optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_workbookFilter = microsoft_graph_entity.and(
  z
    .object({
      criteria: z
        .union([microsoft_graph_workbookFilterCriteria, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookTableColumn = microsoft_graph_entity.and(
  z
    .object({
      index: z.number().gte(-2147483648).lte(2147483647).optional(),
      name: z.string().nullish(),
      values: z.unknown().optional(),
      filter: z
        .union([microsoft_graph_workbookFilter, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookTableRow = microsoft_graph_entity.and(
  z
    .object({
      index: z.number().gte(-2147483648).lte(2147483647).optional(),
      values: z.unknown().optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookSortField = z
  .object({
    ascending: z.boolean().optional(),
    color: z.string().nullish(),
    dataOption: z.string().optional(),
    icon: z.union([microsoft_graph_workbookIcon, z.object({}).partial().passthrough()]).optional(),
    key: z.number().gte(-2147483648).lte(2147483647).optional(),
    sortOn: z.string().optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_workbookTableSort = microsoft_graph_entity.and(
  z
    .object({
      fields: z.array(microsoft_graph_workbookSortField).optional(),
      matchCase: z.boolean().optional(),
      method: z.string().optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbookTable: z.ZodType<microsoft_graph_workbookTable> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        highlightFirstColumn: z.boolean().optional(),
        highlightLastColumn: z.boolean().optional(),
        legacyId: z.string().nullish(),
        name: z.string().nullish(),
        showBandedColumns: z.boolean().optional(),
        showBandedRows: z.boolean().optional(),
        showFilterButton: z.boolean().optional(),
        showHeaders: z.boolean().optional(),
        showTotals: z.boolean().optional(),
        style: z.string().nullish(),
        columns: z.array(microsoft_graph_workbookTableColumn).optional(),
        rows: z.array(microsoft_graph_workbookTableRow).optional(),
        sort: z
          .union([microsoft_graph_workbookTableSort, z.object({}).partial().passthrough()])
          .optional(),
        worksheet: z
          .union([microsoft_graph_workbookWorksheet, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_workbookWorksheet: z.ZodType<microsoft_graph_workbookWorksheet> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        name: z.string().nullish(),
        position: z.number().gte(-2147483648).lte(2147483647).optional(),
        visibility: z.string().optional(),
        charts: z.array(microsoft_graph_workbookChart).optional(),
        names: z.array(microsoft_graph_workbookNamedItem).optional(),
        pivotTables: z.array(microsoft_graph_workbookPivotTable).optional(),
        protection: z
          .union([
            microsoft_graph_workbookWorksheetProtection,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        tables: z.array(microsoft_graph_workbookTable).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_workbookNamedItem: z.ZodType<microsoft_graph_workbookNamedItem> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        comment: z.string().nullish(),
        name: z.string().nullish(),
        scope: z.string().optional(),
        type: z.string().nullish(),
        value: z.unknown().optional(),
        visible: z.boolean().optional(),
        worksheet: z
          .union([microsoft_graph_workbookWorksheet, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_workbookOperationError: z.ZodType<microsoft_graph_workbookOperationError> =
  z.lazy(() =>
    z
      .object({
        code: z.string().nullish(),
        innerError: z
          .union([microsoft_graph_workbookOperationError, z.object({}).partial().passthrough()])
          .optional(),
        message: z.string().nullish(),
        '@odata.type': z.string(),
      })
      .passthrough()
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
        .union([microsoft_graph_workbookOperationError, z.object({}).partial().passthrough()])
        .optional(),
      resourceLocation: z.string().nullish(),
      status: microsoft_graph_workbookOperationStatus.optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workbook = microsoft_graph_entity.and(
  z
    .object({
      application: z
        .union([microsoft_graph_workbookApplication, z.object({}).partial().passthrough()])
        .optional(),
      comments: z.array(microsoft_graph_workbookComment).optional(),
      functions: z
        .union([microsoft_graph_workbookFunctions, z.object({}).partial().passthrough()])
        .optional(),
      names: z.array(microsoft_graph_workbookNamedItem).optional(),
      operations: z.array(microsoft_graph_workbookOperation).optional(),
      tables: z.array(microsoft_graph_workbookTable).optional(),
      worksheets: z.array(microsoft_graph_workbookWorksheet).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_driveItem: z.ZodType<microsoft_graph_driveItem> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        audio: z.union([microsoft_graph_audio, z.object({}).partial().passthrough()]).optional(),
        bundle: z.union([microsoft_graph_bundle, z.object({}).partial().passthrough()]).optional(),
        content: z.string().nullish(),
        cTag: z.string().nullish(),
        deleted: z
          .union([microsoft_graph_deleted, z.object({}).partial().passthrough()])
          .optional(),
        file: z.union([microsoft_graph_file, z.object({}).partial().passthrough()]).optional(),
        fileSystemInfo: z
          .union([microsoft_graph_fileSystemInfo, z.object({}).partial().passthrough()])
          .optional(),
        folder: z.union([microsoft_graph_folder, z.object({}).partial().passthrough()]).optional(),
        image: z.union([microsoft_graph_image, z.object({}).partial().passthrough()]).optional(),
        location: z
          .union([microsoft_graph_geoCoordinates, z.object({}).partial().passthrough()])
          .optional(),
        malware: z
          .union([microsoft_graph_malware, z.object({}).partial().passthrough()])
          .optional(),
        package: z
          .union([microsoft_graph_package, z.object({}).partial().passthrough()])
          .optional(),
        pendingOperations: z
          .union([microsoft_graph_pendingOperations, z.object({}).partial().passthrough()])
          .optional(),
        photo: z.union([microsoft_graph_photo, z.object({}).partial().passthrough()]).optional(),
        publication: z
          .union([microsoft_graph_publicationFacet, z.object({}).partial().passthrough()])
          .optional(),
        remoteItem: z
          .union([microsoft_graph_remoteItem, z.object({}).partial().passthrough()])
          .optional(),
        root: z.union([microsoft_graph_root, z.object({}).partial().passthrough()]).optional(),
        searchResult: z
          .union([microsoft_graph_searchResult, z.object({}).partial().passthrough()])
          .optional(),
        shared: z.union([microsoft_graph_shared, z.object({}).partial().passthrough()]).optional(),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().passthrough()])
          .optional(),
        size: z.number().nullish(),
        specialFolder: z
          .union([microsoft_graph_specialFolder, z.object({}).partial().passthrough()])
          .optional(),
        video: z.union([microsoft_graph_video, z.object({}).partial().passthrough()]).optional(),
        webDavUrl: z.string().nullish(),
        analytics: z
          .union([microsoft_graph_itemAnalytics, z.object({}).partial().passthrough()])
          .optional(),
        children: z.array(microsoft_graph_driveItem).optional(),
        listItem: z
          .union([microsoft_graph_listItem, z.object({}).partial().passthrough()])
          .optional(),
        permissions: z.array(microsoft_graph_permission).optional(),
        retentionLabel: z
          .union([microsoft_graph_itemRetentionLabel, z.object({}).partial().passthrough()])
          .optional(),
        subscriptions: z.array(microsoft_graph_subscription).optional(),
        thumbnails: z.array(microsoft_graph_thumbnailSet).optional(),
        versions: z.array(microsoft_graph_driveItemVersion).optional(),
        workbook: z
          .union([microsoft_graph_workbook, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string().default('#microsoft.graph.driveItem'),
      })
      .passthrough()
  )
);
const microsoft_graph_itemActivity: z.ZodType<microsoft_graph_itemActivity> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        access: z
          .union([microsoft_graph_accessAction, z.object({}).partial().passthrough()])
          .optional(),
        activityDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        actor: z
          .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
          .optional(),
        driveItem: z
          .union([microsoft_graph_driveItem, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_itemActivityStat: z.ZodType<microsoft_graph_itemActivityStat> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        access: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().passthrough()])
          .optional(),
        create: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().passthrough()])
          .optional(),
        delete: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().passthrough()])
          .optional(),
        edit: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().passthrough()])
          .optional(),
        endDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        incompleteData: z
          .union([microsoft_graph_incompleteData, z.object({}).partial().passthrough()])
          .optional(),
        isTrending: z.boolean().nullish(),
        move: z
          .union([microsoft_graph_itemActionStat, z.object({}).partial().passthrough()])
          .optional(),
        startDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        activities: z.array(microsoft_graph_itemActivity).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_itemAnalytics: z.ZodType<microsoft_graph_itemAnalytics> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        allTime: z
          .union([microsoft_graph_itemActivityStat, z.object({}).partial().passthrough()])
          .optional(),
        itemActivityStats: z.array(microsoft_graph_itemActivityStat).optional(),
        lastSevenDays: z
          .union([microsoft_graph_itemActivityStat, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_booleanColumn = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_calculatedColumn = z
  .object({
    format: z.string().nullish(),
    formula: z.string().nullish(),
    outputType: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_choiceColumn = z
  .object({
    allowTextEntry: z.boolean().nullish(),
    choices: z.array(z.string().nullable()).optional(),
    displayAs: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_contentApprovalStatusColumn = z
  .object({ '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_currencyColumn = z
  .object({ locale: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_dateTimeColumn = z
  .object({
    displayAs: z.string().nullish(),
    format: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_defaultColumnValue = z
  .object({ formula: z.string().nullish(), value: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_geolocationColumn = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_hyperlinkOrPictureColumn = z
  .object({ isPicture: z.boolean().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_lookupColumn = z
  .object({
    allowMultipleValues: z.boolean().nullish(),
    allowUnlimitedLength: z.boolean().nullish(),
    columnName: z.string().nullish(),
    listId: z.string().nullish(),
    primaryLookupColumnId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_numberColumn = z
  .object({
    decimalPlaces: z.string().nullish(),
    displayAs: z.string().nullish(),
    maximum: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    minimum: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_personOrGroupColumn = z
  .object({
    allowMultipleSelection: z.boolean().nullish(),
    chooseFromType: z.string().nullish(),
    displayAs: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_termStore_localizedDescription = z
  .object({
    description: z.string().nullish(),
    languageTag: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_termStore_localizedLabel = z
  .object({
    isDefault: z.boolean().nullish(),
    languageTag: z.string().nullish(),
    name: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_keyValue = z
  .object({ key: z.string().nullish(), value: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_termStore_relationType = z.enum(['pin', 'reuse', 'unknownFutureValue']);
const microsoft_graph_termStore_localizedName = z
  .object({
    languageTag: z.string().nullish(),
    name: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
          .nullish(),
        description: z.string().nullish(),
        displayName: z.string().nullish(),
        parentSiteId: z.string().nullish(),
        scope: z
          .union([microsoft_graph_termStore_termGroupScope, z.object({}).partial().passthrough()])
          .optional(),
        sets: z.array(microsoft_graph_termStore_set).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
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
          .nullish(),
        description: z.string().nullish(),
        localizedNames: z.array(microsoft_graph_termStore_localizedName).optional(),
        properties: z.array(microsoft_graph_keyValue).optional(),
        children: z.array(microsoft_graph_termStore_term).optional(),
        parentGroup: microsoft_graph_termStore_group.optional(),
        relations: z.array(microsoft_graph_termStore_relation).optional(),
        terms: z.array(microsoft_graph_termStore_term).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_termStore_relation: z.ZodType<microsoft_graph_termStore_relation> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          relationship: z
            .union([microsoft_graph_termStore_relationType, z.object({}).partial().passthrough()])
            .optional(),
          fromTerm: z
            .union([microsoft_graph_termStore_term, z.object({}).partial().passthrough()])
            .optional(),
          set: z
            .union([microsoft_graph_termStore_set, z.object({}).partial().passthrough()])
            .optional(),
          toTerm: z
            .union([microsoft_graph_termStore_term, z.object({}).partial().passthrough()])
            .optional(),
          '@odata.type': z.string(),
        })
        .passthrough()
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
          .nullish(),
        descriptions: z.array(microsoft_graph_termStore_localizedDescription).optional(),
        labels: z.array(microsoft_graph_termStore_localizedLabel).optional(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        properties: z.array(microsoft_graph_keyValue).optional(),
        children: z.array(microsoft_graph_termStore_term).optional(),
        relations: z.array(microsoft_graph_termStore_relation).optional(),
        set: z
          .union([microsoft_graph_termStore_set, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_termColumn = z
  .object({
    allowMultipleValues: z.boolean().nullish(),
    showFullyQualifiedName: z.boolean().nullish(),
    parentTerm: z
      .union([microsoft_graph_termStore_term, z.object({}).partial().passthrough()])
      .optional(),
    termSet: z
      .union([microsoft_graph_termStore_set, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_textColumn = z
  .object({
    allowMultipleLines: z.boolean().nullish(),
    appendChangesToExistingText: z.boolean().nullish(),
    linesForEditing: z.number().gte(-2147483648).lte(2147483647).nullish(),
    maxLength: z.number().gte(-2147483648).lte(2147483647).nullish(),
    textType: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_thumbnailColumn = z.object({ '@odata.type': z.string() }).passthrough();
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
    displayName: z.string().nullish(),
    languageTag: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_columnValidation = z
  .object({
    defaultLanguage: z.string().nullish(),
    descriptions: z.array(microsoft_graph_displayNameLocalization).optional(),
    formula: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_columnDefinition: z.ZodType<microsoft_graph_columnDefinition> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        boolean: z
          .union([microsoft_graph_booleanColumn, z.object({}).partial().passthrough()])
          .optional(),
        calculated: z
          .union([microsoft_graph_calculatedColumn, z.object({}).partial().passthrough()])
          .optional(),
        choice: z
          .union([microsoft_graph_choiceColumn, z.object({}).partial().passthrough()])
          .optional(),
        columnGroup: z.string().nullish(),
        contentApprovalStatus: z
          .union([
            microsoft_graph_contentApprovalStatusColumn,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        currency: z
          .union([microsoft_graph_currencyColumn, z.object({}).partial().passthrough()])
          .optional(),
        dateTime: z
          .union([microsoft_graph_dateTimeColumn, z.object({}).partial().passthrough()])
          .optional(),
        defaultValue: z
          .union([microsoft_graph_defaultColumnValue, z.object({}).partial().passthrough()])
          .optional(),
        description: z.string().nullish(),
        displayName: z.string().nullish(),
        enforceUniqueValues: z.boolean().nullish(),
        geolocation: z
          .union([microsoft_graph_geolocationColumn, z.object({}).partial().passthrough()])
          .optional(),
        hidden: z.boolean().nullish(),
        hyperlinkOrPicture: z
          .union([microsoft_graph_hyperlinkOrPictureColumn, z.object({}).partial().passthrough()])
          .optional(),
        indexed: z.boolean().nullish(),
        isDeletable: z.boolean().nullish(),
        isReorderable: z.boolean().nullish(),
        isSealed: z.boolean().nullish(),
        lookup: z
          .union([microsoft_graph_lookupColumn, z.object({}).partial().passthrough()])
          .optional(),
        name: z.string().nullish(),
        number: z
          .union([microsoft_graph_numberColumn, z.object({}).partial().passthrough()])
          .optional(),
        personOrGroup: z
          .union([microsoft_graph_personOrGroupColumn, z.object({}).partial().passthrough()])
          .optional(),
        propagateChanges: z.boolean().nullish(),
        readOnly: z.boolean().nullish(),
        required: z.boolean().nullish(),
        sourceContentType: z
          .union([microsoft_graph_contentTypeInfo, z.object({}).partial().passthrough()])
          .optional(),
        term: z
          .union([microsoft_graph_termColumn, z.object({}).partial().passthrough()])
          .optional(),
        text: z
          .union([microsoft_graph_textColumn, z.object({}).partial().passthrough()])
          .optional(),
        thumbnail: z
          .union([microsoft_graph_thumbnailColumn, z.object({}).partial().passthrough()])
          .optional(),
        type: z
          .union([microsoft_graph_columnTypes, z.object({}).partial().passthrough()])
          .optional(),
        validation: z
          .union([microsoft_graph_columnValidation, z.object({}).partial().passthrough()])
          .optional(),
        sourceColumn: z
          .union([microsoft_graph_columnDefinition, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_documentSetContent = z
  .object({
    contentType: z
      .union([microsoft_graph_contentTypeInfo, z.object({}).partial().passthrough()])
      .optional(),
    fileName: z.string().nullish(),
    folderName: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_documentSet = z
  .object({
    allowedContentTypes: z.array(microsoft_graph_contentTypeInfo).optional(),
    defaultContents: z.array(microsoft_graph_documentSetContent).optional(),
    propagateWelcomePageChanges: z.boolean().nullish(),
    shouldPrefixNameToFile: z.boolean().nullish(),
    welcomePageUrl: z.string().nullish(),
    sharedColumns: z.array(microsoft_graph_columnDefinition).optional(),
    welcomePageColumns: z.array(microsoft_graph_columnDefinition).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_contentTypeOrder = z
  .object({
    default: z.boolean().nullish(),
    position: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_columnLink = microsoft_graph_entity.and(
  z.object({ name: z.string().nullish(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_contentType: z.ZodType<microsoft_graph_contentType> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        associatedHubsUrls: z.array(z.string().nullable()).optional(),
        description: z.string().nullish(),
        documentSet: z
          .union([microsoft_graph_documentSet, z.object({}).partial().passthrough()])
          .optional(),
        documentTemplate: z
          .union([microsoft_graph_documentSetContent, z.object({}).partial().passthrough()])
          .optional(),
        group: z.string().nullish(),
        hidden: z.boolean().nullish(),
        inheritedFrom: z
          .union([microsoft_graph_itemReference, z.object({}).partial().passthrough()])
          .optional(),
        isBuiltIn: z.boolean().nullish(),
        name: z.string().nullish(),
        order: z
          .union([microsoft_graph_contentTypeOrder, z.object({}).partial().passthrough()])
          .optional(),
        parentId: z.string().nullish(),
        propagateChanges: z.boolean().nullish(),
        readOnly: z.boolean().nullish(),
        sealed: z.boolean().nullish(),
        base: z
          .union([microsoft_graph_contentType, z.object({}).partial().passthrough()])
          .optional(),
        baseTypes: z.array(microsoft_graph_contentType).optional(),
        columnLinks: z.array(microsoft_graph_columnLink).optional(),
        columnPositions: z.array(microsoft_graph_columnDefinition).optional(),
        columns: z.array(microsoft_graph_columnDefinition).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_listInfo = z
  .object({
    contentTypesEnabled: z.boolean().nullish(),
    hidden: z.boolean().nullish(),
    template: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_systemFacet = z.object({ '@odata.type': z.string() }).passthrough();
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
        .nullish(),
      lastActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      resourceLocation: z.string().nullish(),
      status: z
        .union([microsoft_graph_longRunningOperationStatus, z.object({}).partial().passthrough()])
        .optional(),
      statusDetail: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_richLongRunningOperation = microsoft_graph_longRunningOperation.and(
  z
    .object({
      error: z
        .union([microsoft_graph_publicError, z.object({}).partial().passthrough()])
        .optional(),
      percentageComplete: z.number().gte(-2147483648).lte(2147483647).nullish(),
      resourceId: z.string().nullish(),
      type: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_list: z.ZodType<microsoft_graph_list> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        displayName: z.string().nullish(),
        list: z.union([microsoft_graph_listInfo, z.object({}).partial().passthrough()]).optional(),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().passthrough()])
          .optional(),
        system: z
          .union([microsoft_graph_systemFacet, z.object({}).partial().passthrough()])
          .optional(),
        columns: z.array(microsoft_graph_columnDefinition).optional(),
        contentTypes: z.array(microsoft_graph_contentType).optional(),
        drive: z.union([microsoft_graph_drive, z.object({}).partial().passthrough()]).optional(),
        items: z.array(microsoft_graph_listItem).optional(),
        operations: z.array(microsoft_graph_richLongRunningOperation).optional(),
        subscriptions: z.array(microsoft_graph_subscription).optional(),
        '@odata.type': z.string().default('#microsoft.graph.list'),
      })
      .passthrough()
  )
);
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
          .union([microsoft_graph_pageLayoutType, z.object({}).partial().passthrough()])
          .optional(),
        publishingState: z
          .union([microsoft_graph_publicationFacet, z.object({}).partial().passthrough()])
          .optional(),
        title: z.string().nullish(),
        '@odata.type': z.string().default('#microsoft.graph.baseSitePage'),
      })
      .passthrough()
  )
);
const microsoft_graph_termStore_store = microsoft_graph_entity.and(
  z
    .object({
      defaultLanguageTag: z.string().optional(),
      languageTags: z.array(z.string()).optional(),
      groups: z.array(microsoft_graph_termStore_group).optional(),
      sets: z.array(microsoft_graph_termStore_set).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_site: z.ZodType<microsoft_graph_site> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        displayName: z.string().nullish(),
        error: z
          .union([microsoft_graph_publicError, z.object({}).partial().passthrough()])
          .optional(),
        isPersonalSite: z.boolean().nullish(),
        root: z.union([microsoft_graph_root, z.object({}).partial().passthrough()]).optional(),
        sharepointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().passthrough()])
          .optional(),
        siteCollection: z
          .union([microsoft_graph_siteCollection, z.object({}).partial().passthrough()])
          .optional(),
        analytics: z
          .union([microsoft_graph_itemAnalytics, z.object({}).partial().passthrough()])
          .optional(),
        columns: z.array(microsoft_graph_columnDefinition).optional(),
        contentTypes: z.array(microsoft_graph_contentType).optional(),
        drive: z.union([microsoft_graph_drive, z.object({}).partial().passthrough()]).optional(),
        drives: z.array(microsoft_graph_drive).optional(),
        externalColumns: z.array(microsoft_graph_columnDefinition).optional(),
        items: z.array(microsoft_graph_baseItem).optional(),
        lists: z.array(microsoft_graph_list).optional(),
        onenote: z
          .union([microsoft_graph_onenote, z.object({}).partial().passthrough()])
          .optional(),
        operations: z.array(microsoft_graph_richLongRunningOperation).optional(),
        pages: z.array(microsoft_graph_baseSitePage).optional(),
        permissions: z.array(microsoft_graph_permission).optional(),
        sites: z.array(microsoft_graph_site).optional(),
        termStore: z
          .union([microsoft_graph_termStore_store, z.object({}).partial().passthrough()])
          .optional(),
        termStores: z.array(microsoft_graph_termStore_store).optional(),
        '@odata.type': z.string().default('#microsoft.graph.site'),
      })
      .passthrough()
  )
);
const microsoft_graph_giphyRatingType = z.enum(['strict', 'moderate', 'unknownFutureValue']);
const microsoft_graph_teamFunSettings = z
  .object({
    allowCustomMemes: z.boolean().nullish(),
    allowGiphy: z.boolean().nullish(),
    allowStickersAndMemes: z.boolean().nullish(),
    giphyContentRating: z
      .union([microsoft_graph_giphyRatingType, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_teamGuestSettings = z
  .object({
    allowCreateUpdateChannels: z.boolean().nullish(),
    allowDeleteChannels: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_teamMemberSettings = z
  .object({
    allowAddRemoveApps: z.boolean().nullish(),
    allowCreatePrivateChannels: z.boolean().nullish(),
    allowCreateUpdateChannels: z.boolean().nullish(),
    allowCreateUpdateRemoveConnectors: z.boolean().nullish(),
    allowCreateUpdateRemoveTabs: z.boolean().nullish(),
    allowDeleteChannels: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_teamMessagingSettings = z
  .object({
    allowChannelMentions: z.boolean().nullish(),
    allowOwnerDeleteMessages: z.boolean().nullish(),
    allowTeamMentions: z.boolean().nullish(),
    allowUserDeleteMessages: z.boolean().nullish(),
    allowUserEditMessages: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    guestsCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    membersCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    ownersCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    guestsCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    hasMembersFromOtherTenants: z.boolean().nullish(),
    membersCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    ownersCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_conversationMember = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      roles: z.array(z.string().nullable()).optional(),
      visibleHistoryStartDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_chatMessageAttachment = z
  .object({
    content: z.string().nullish(),
    contentType: z.string().nullish(),
    contentUrl: z.string().nullish(),
    id: z.string().nullish(),
    name: z.string().nullish(),
    teamsAppId: z.string().nullish(),
    thumbnailUrl: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_channelIdentity = z
  .object({
    channelId: z.string().nullish(),
    teamId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_eventMessageDetail = z.object({ '@odata.type': z.string() }).passthrough();
const microsoft_graph_chatMessageFromIdentitySet = microsoft_graph_identitySet.and(
  z
    .object({ '@odata.type': z.string().default('#microsoft.graph.chatMessageFromIdentitySet') })
    .passthrough()
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
        .union([
          microsoft_graph_teamworkConversationIdentityType,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.teamworkConversationIdentity'),
    })
    .passthrough()
);
const microsoft_graph_chatMessageMentionedIdentitySet = microsoft_graph_identitySet.and(
  z
    .object({
      conversation: z
        .union([microsoft_graph_teamworkConversationIdentity, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.chatMessageMentionedIdentitySet'),
    })
    .passthrough()
);
const microsoft_graph_chatMessageMention = z
  .object({
    id: z.number().gte(-2147483648).lte(2147483647).nullish(),
    mentioned: z
      .union([
        microsoft_graph_chatMessageMentionedIdentitySet,
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    mentionText: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_chatMessageActions = z.enum([
  'reactionAdded',
  'reactionRemoved',
  'actionUndefined',
  'unknownFutureValue',
]);
const microsoft_graph_chatMessageReactionIdentitySet = microsoft_graph_identitySet.and(
  z
    .object({
      '@odata.type': z.string().default('#microsoft.graph.chatMessageReactionIdentitySet'),
    })
    .passthrough()
);
const microsoft_graph_chatMessageReaction = z
  .object({
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .optional(),
    displayName: z.string().nullish(),
    reactionContentUrl: z.string().nullish(),
    reactionType: z.string().optional(),
    user: microsoft_graph_chatMessageReactionIdentitySet.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_chatMessageHistoryItem = z
  .object({
    actions: microsoft_graph_chatMessageActions.optional(),
    modifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .optional(),
    reaction: z
      .union([microsoft_graph_chatMessageReaction, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    complianceUrl: z.string().nullish(),
    generalText: z.string().nullish(),
    matchedConditionDescriptions: z.array(z.string().nullable()).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    justificationText: z.string().nullish(),
    policyTip: z
      .union([
        microsoft_graph_chatMessagePolicyViolationPolicyTip,
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    userAction: z
      .union([
        microsoft_graph_chatMessagePolicyViolationUserActionTypes,
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    verdictDetails: z
      .union([
        microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes,
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_teamworkHostedContent = microsoft_graph_entity.and(
  z
    .object({
      contentBytes: z.string().nullish(),
      contentType: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_chatMessageHostedContent = microsoft_graph_teamworkHostedContent.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_chatMessage: z.ZodType<microsoft_graph_chatMessage> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        attachments: z.array(microsoft_graph_chatMessageAttachment).optional(),
        body: microsoft_graph_itemBody.optional(),
        channelIdentity: z
          .union([microsoft_graph_channelIdentity, z.object({}).partial().passthrough()])
          .optional(),
        chatId: z.string().nullish(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        deletedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        etag: z.string().nullish(),
        eventDetail: z
          .union([microsoft_graph_eventMessageDetail, z.object({}).partial().passthrough()])
          .optional(),
        from: z
          .union([microsoft_graph_chatMessageFromIdentitySet, z.object({}).partial().passthrough()])
          .optional(),
        importance: microsoft_graph_chatMessageImportance.optional(),
        lastEditedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        locale: z.string().optional(),
        mentions: z.array(microsoft_graph_chatMessageMention).optional(),
        messageHistory: z.array(microsoft_graph_chatMessageHistoryItem).optional(),
        messageType: microsoft_graph_chatMessageType.optional(),
        policyViolation: z
          .union([microsoft_graph_chatMessagePolicyViolation, z.object({}).partial().passthrough()])
          .optional(),
        reactions: z.array(microsoft_graph_chatMessageReaction).optional(),
        replyToId: z.string().nullish(),
        subject: z.string().nullish(),
        summary: z.string().nullish(),
        webUrl: z.string().nullish(),
        hostedContents: z.array(microsoft_graph_chatMessageHostedContent).optional(),
        replies: z.array(microsoft_graph_chatMessage).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_teamInfo: z.ZodType<microsoft_graph_teamInfo> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        displayName: z.string().nullish(),
        tenantId: z.string().nullish(),
        team: z.union([microsoft_graph_team, z.object({}).partial().passthrough()]).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_sharedWithChannelTeamInfo: z.ZodType<microsoft_graph_sharedWithChannelTeamInfo> =
  z.lazy(() =>
    microsoft_graph_teamInfo.and(
      z
        .object({
          isHostTeam: z.boolean().nullish(),
          allowedMembers: z.array(microsoft_graph_conversationMember).optional(),
          '@odata.type': z.string(),
        })
        .passthrough()
    )
  );
const microsoft_graph_teamsTabConfiguration = z
  .object({
    contentUrl: z.string().nullish(),
    entityId: z.string().nullish(),
    removeUrl: z.string().nullish(),
    websiteUrl: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    permissionValue: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_teamsAppPermissionSet = z
  .object({
    resourceSpecificPermissions: z
      .array(microsoft_graph_teamsAppResourceSpecificPermission)
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_teamsAppAuthorization = z
  .object({
    clientAppId: z.string().nullish(),
    requiredPermissionSet: z
      .union([microsoft_graph_teamsAppPermissionSet, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_teamsAppPublishingState = z.enum([
  'submitted',
  'rejected',
  'published',
  'unknownFutureValue',
]);
const microsoft_graph_teamworkBot = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_teamsAppDefinition = microsoft_graph_entity.and(
  z
    .object({
      authorization: z
        .union([microsoft_graph_teamsAppAuthorization, z.object({}).partial().passthrough()])
        .optional(),
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      description: z.string().nullish(),
      displayName: z.string().nullish(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      publishingState: z
        .union([microsoft_graph_teamsAppPublishingState, z.object({}).partial().passthrough()])
        .optional(),
      shortDescription: z.string().nullish(),
      teamsAppId: z.string().nullish(),
      version: z.string().nullish(),
      bot: z.union([microsoft_graph_teamworkBot, z.object({}).partial().passthrough()]).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_teamsApp = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      distributionMethod: z
        .union([microsoft_graph_teamsAppDistributionMethod, z.object({}).partial().passthrough()])
        .optional(),
      externalId: z.string().nullish(),
      appDefinitions: z.array(microsoft_graph_teamsAppDefinition).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_teamsTab = microsoft_graph_entity.and(
  z
    .object({
      configuration: z
        .union([microsoft_graph_teamsTabConfiguration, z.object({}).partial().passthrough()])
        .optional(),
      displayName: z.string().nullish(),
      webUrl: z.string().nullish(),
      teamsApp: z
        .union([microsoft_graph_teamsApp, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
          .nullish(),
        description: z.string().nullish(),
        displayName: z.string().optional(),
        email: z.string().nullish(),
        isArchived: z.boolean().nullish(),
        isFavoriteByDefault: z.boolean().nullish(),
        membershipType: z
          .union([microsoft_graph_channelMembershipType, z.object({}).partial().passthrough()])
          .optional(),
        summary: z
          .union([microsoft_graph_channelSummary, z.object({}).partial().passthrough()])
          .optional(),
        tenantId: z.string().nullish(),
        webUrl: z.string().nullish(),
        allMembers: z.array(microsoft_graph_conversationMember).optional(),
        filesFolder: z
          .union([microsoft_graph_driveItem, z.object({}).partial().passthrough()])
          .optional(),
        members: z.array(microsoft_graph_conversationMember).optional(),
        messages: z.array(microsoft_graph_chatMessage).optional(),
        sharedWithTeams: z.array(microsoft_graph_sharedWithChannelTeamInfo).optional(),
        tabs: z.array(microsoft_graph_teamsTab).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_teamsAppInstallation = microsoft_graph_entity.and(
  z
    .object({
      consentedPermissionSet: z
        .union([microsoft_graph_teamsAppPermissionSet, z.object({}).partial().passthrough()])
        .optional(),
      teamsApp: z
        .union([microsoft_graph_teamsApp, z.object({}).partial().passthrough()])
        .optional(),
      teamsAppDefinition: z
        .union([microsoft_graph_teamsAppDefinition, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_operationError = z
  .object({ code: z.string().nullish(), message: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
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
      attemptsCount: z.number().gte(-2147483648).lte(2147483647).optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      error: z
        .union([microsoft_graph_operationError, z.object({}).partial().passthrough()])
        .optional(),
      lastActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      operationType: microsoft_graph_teamsAsyncOperationType.optional(),
      status: microsoft_graph_teamsAsyncOperationStatus.optional(),
      targetResourceId: z.string().nullish(),
      targetResourceLocation: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_timeClockSettings = z
  .object({
    approvedLocation: z
      .union([microsoft_graph_geoCoordinates, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_changeTrackedEntity = microsoft_graph_entity.and(
  z
    .object({
      createdBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      lastModifiedBy: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_dayNote = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      dayNoteDate: z
        .string()
        .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
        .nullish(),
      draftDayNote: z
        .union([microsoft_graph_itemBody, z.object({}).partial().passthrough()])
        .optional(),
      sharedDayNote: z
        .union([microsoft_graph_itemBody, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.dayNote'),
    })
    .passthrough()
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
        .union([microsoft_graph_scheduleChangeRequestActor, z.object({}).partial().passthrough()])
        .optional(),
      managerActionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      managerActionMessage: z.string().nullish(),
      managerUserId: z.string().nullish(),
      senderDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      senderMessage: z.string().nullish(),
      senderUserId: z.string().nullish(),
      state: z
        .union([microsoft_graph_scheduleChangeState, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.scheduleChangeRequest'),
    })
    .passthrough()
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
        .nullish(),
      recipientActionMessage: z.string().nullish(),
      recipientUserId: z.string().nullish(),
      senderShiftId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.offerShiftRequest'),
    })
    .passthrough()
);
const microsoft_graph_openShiftChangeRequest = microsoft_graph_scheduleChangeRequest.and(
  z
    .object({
      openShiftId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.openShiftChangeRequest'),
    })
    .passthrough()
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
      .nullish(),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    theme: microsoft_graph_scheduleEntityTheme.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_shiftActivity = z
  .object({
    code: z.string().nullish(),
    displayName: z.string().nullish(),
    endDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    isPaid: z.boolean().nullish(),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    theme: microsoft_graph_scheduleEntityTheme.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_shiftItem = microsoft_graph_scheduleEntity.and(
  z
    .object({
      activities: z.array(microsoft_graph_shiftActivity).optional(),
      displayName: z.string().nullish(),
      notes: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_openShiftItem = microsoft_graph_shiftItem.and(
  z
    .object({
      openSlotCount: z.number().gte(-2147483648).lte(2147483647).optional(),
      '@odata.type': z.string().default('#microsoft.graph.openShiftItem'),
    })
    .passthrough()
);
const microsoft_graph_openShift = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      draftOpenShift: z
        .union([microsoft_graph_openShiftItem, z.object({}).partial().passthrough()])
        .optional(),
      isStagedForDeletion: z.boolean().nullish(),
      schedulingGroupId: z.string().nullish(),
      sharedOpenShift: z
        .union([microsoft_graph_openShiftItem, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.openShift'),
    })
    .passthrough()
);
const microsoft_graph_schedulingGroup = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      code: z.string().nullish(),
      displayName: z.string().nullish(),
      isActive: z.boolean().nullish(),
      userIds: z.array(z.string().nullable()).optional(),
      '@odata.type': z.string().default('#microsoft.graph.schedulingGroup'),
    })
    .passthrough()
);
const microsoft_graph_shift = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      draftShift: z
        .union([microsoft_graph_shiftItem, z.object({}).partial().passthrough()])
        .optional(),
      isStagedForDeletion: z.boolean().nullish(),
      schedulingGroupId: z.string().nullish(),
      sharedShift: z
        .union([microsoft_graph_shiftItem, z.object({}).partial().passthrough()])
        .optional(),
      userId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.shift'),
    })
    .passthrough()
);
const microsoft_graph_swapShiftsChangeRequest = microsoft_graph_offerShiftRequest.and(
  z
    .object({
      recipientShiftId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.swapShiftsChangeRequest'),
    })
    .passthrough()
);
const microsoft_graph_timeCardEvent = z
  .object({
    dateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .optional(),
    isAtApprovedLocation: z.boolean().nullish(),
    notes: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_timeCardBreak = z
  .object({
    breakId: z.string().nullish(),
    end: z.union([microsoft_graph_timeCardEvent, z.object({}).partial().passthrough()]).optional(),
    notes: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
    start: microsoft_graph_timeCardEvent.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_confirmedBy = z.enum(['none', 'user', 'manager', 'unknownFutureValue']);
const microsoft_graph_timeCardEntry = z
  .object({
    breaks: z.array(microsoft_graph_timeCardBreak).optional(),
    clockInEvent: z
      .union([microsoft_graph_timeCardEvent, z.object({}).partial().passthrough()])
      .optional(),
    clockOutEvent: z
      .union([microsoft_graph_timeCardEvent, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_timeCardState = z.enum([
  'clockedIn',
  'onBreak',
  'clockedOut',
  'unknownFutureValue',
]);
const microsoft_graph_timeCard = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      breaks: z.array(microsoft_graph_timeCardBreak).optional(),
      clockInEvent: z
        .union([microsoft_graph_timeCardEvent, z.object({}).partial().passthrough()])
        .optional(),
      clockOutEvent: z
        .union([microsoft_graph_timeCardEvent, z.object({}).partial().passthrough()])
        .optional(),
      confirmedBy: z
        .union([microsoft_graph_confirmedBy, z.object({}).partial().passthrough()])
        .optional(),
      notes: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
      originalEntry: z
        .union([microsoft_graph_timeCardEntry, z.object({}).partial().passthrough()])
        .optional(),
      state: z
        .union([microsoft_graph_timeCardState, z.object({}).partial().passthrough()])
        .optional(),
      userId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.timeCard'),
    })
    .passthrough()
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
      code: z.string().nullish(),
      displayName: z.string().nullish(),
      iconType: z
        .union([microsoft_graph_timeOffReasonIconType, z.object({}).partial().passthrough()])
        .optional(),
      isActive: z.boolean().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.timeOffReason'),
    })
    .passthrough()
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
        .nullish(),
      startDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      timeOffReasonId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.timeOffRequest'),
    })
    .passthrough()
);
const microsoft_graph_timeOffItem = microsoft_graph_scheduleEntity.and(
  z.object({ timeOffReasonId: z.string().nullish(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_timeOff = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      draftTimeOff: z
        .union([microsoft_graph_timeOffItem, z.object({}).partial().passthrough()])
        .optional(),
      isStagedForDeletion: z.boolean().nullish(),
      sharedTimeOff: z
        .union([microsoft_graph_timeOffItem, z.object({}).partial().passthrough()])
        .optional(),
      userId: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.timeOff'),
    })
    .passthrough()
);
const microsoft_graph_schedule = microsoft_graph_entity.and(
  z
    .object({
      enabled: z.boolean().nullish(),
      isActivitiesIncludedWhenCopyingShiftsEnabled: z.boolean().nullish(),
      offerShiftRequestsEnabled: z.boolean().nullish(),
      openShiftsEnabled: z.boolean().nullish(),
      provisionStatus: z
        .union([microsoft_graph_operationStatus, z.object({}).partial().passthrough()])
        .optional(),
      provisionStatusCode: z.string().nullish(),
      startDayOfWeek: z
        .union([microsoft_graph_dayOfWeek, z.object({}).partial().passthrough()])
        .optional(),
      swapShiftsRequestsEnabled: z.boolean().nullish(),
      timeClockEnabled: z.boolean().nullish(),
      timeClockSettings: z
        .union([microsoft_graph_timeClockSettings, z.object({}).partial().passthrough()])
        .optional(),
      timeOffRequestsEnabled: z.boolean().nullish(),
      timeZone: z.string().nullish(),
      workforceIntegrationIds: z.array(z.string().nullable()).optional(),
      dayNotes: z.array(microsoft_graph_dayNote).optional(),
      offerShiftRequests: z.array(microsoft_graph_offerShiftRequest).optional(),
      openShiftChangeRequests: z.array(microsoft_graph_openShiftChangeRequest).optional(),
      openShifts: z.array(microsoft_graph_openShift).optional(),
      schedulingGroups: z.array(microsoft_graph_schedulingGroup).optional(),
      shifts: z.array(microsoft_graph_shift).optional(),
      swapShiftsChangeRequests: z.array(microsoft_graph_swapShiftsChangeRequest).optional(),
      timeCards: z.array(microsoft_graph_timeCard).optional(),
      timeOffReasons: z.array(microsoft_graph_timeOffReason).optional(),
      timeOffRequests: z.array(microsoft_graph_timeOffRequest).optional(),
      timesOff: z.array(microsoft_graph_timeOff).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_teamworkTagType = z.enum(['standard', 'unknownFutureValue']);
const microsoft_graph_teamworkTagMember = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      tenantId: z.string().nullish(),
      userId: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_teamworkTag = microsoft_graph_entity.and(
  z
    .object({
      description: z.string().nullish(),
      displayName: z.string().nullish(),
      memberCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
      tagType: z
        .union([microsoft_graph_teamworkTagType, z.object({}).partial().passthrough()])
        .optional(),
      teamId: z.string().nullish(),
      members: z.array(microsoft_graph_teamworkTagMember).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_teamsTemplate = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_team: z.ZodType<microsoft_graph_team> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        classification: z.string().nullish(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        description: z.string().nullish(),
        displayName: z.string().nullish(),
        firstChannelName: z.string().nullish(),
        funSettings: z
          .union([microsoft_graph_teamFunSettings, z.object({}).partial().passthrough()])
          .optional(),
        guestSettings: z
          .union([microsoft_graph_teamGuestSettings, z.object({}).partial().passthrough()])
          .optional(),
        internalId: z.string().nullish(),
        isArchived: z.boolean().nullish(),
        memberSettings: z
          .union([microsoft_graph_teamMemberSettings, z.object({}).partial().passthrough()])
          .optional(),
        messagingSettings: z
          .union([microsoft_graph_teamMessagingSettings, z.object({}).partial().passthrough()])
          .optional(),
        specialization: z
          .union([microsoft_graph_teamSpecialization, z.object({}).partial().passthrough()])
          .optional(),
        summary: z
          .union([microsoft_graph_teamSummary, z.object({}).partial().passthrough()])
          .optional(),
        tenantId: z.string().nullish(),
        visibility: z
          .union([microsoft_graph_teamVisibilityType, z.object({}).partial().passthrough()])
          .optional(),
        webUrl: z.string().nullish(),
        allChannels: z.array(microsoft_graph_channel).optional(),
        channels: z.array(microsoft_graph_channel).optional(),
        group: z.union([microsoft_graph_group, z.object({}).partial().passthrough()]).optional(),
        incomingChannels: z.array(microsoft_graph_channel).optional(),
        installedApps: z.array(microsoft_graph_teamsAppInstallation).optional(),
        members: z.array(microsoft_graph_conversationMember).optional(),
        operations: z.array(microsoft_graph_teamsAsyncOperation).optional(),
        permissionGrants: z.array(microsoft_graph_resourceSpecificPermissionGrant).optional(),
        photo: z
          .union([microsoft_graph_profilePhoto, z.object({}).partial().passthrough()])
          .optional(),
        primaryChannel: z
          .union([microsoft_graph_channel, z.object({}).partial().passthrough()])
          .optional(),
        schedule: z
          .union([microsoft_graph_schedule, z.object({}).partial().passthrough()])
          .optional(),
        tags: z.array(microsoft_graph_teamworkTag).optional(),
        template: z
          .union([microsoft_graph_teamsTemplate, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_group: z.ZodType<microsoft_graph_group> = z.lazy(() =>
  microsoft_graph_directoryObject.and(
    z
      .object({
        allowExternalSenders: z.boolean().nullish(),
        assignedLabels: z.array(microsoft_graph_assignedLabel).optional(),
        assignedLicenses: z.array(microsoft_graph_assignedLicense).optional(),
        autoSubscribeNewMembers: z.boolean().nullish(),
        classification: z.string().nullish(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        description: z.string().nullish(),
        displayName: z.string().nullish(),
        expirationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        groupTypes: z.array(z.string()).optional(),
        hasMembersWithLicenseErrors: z.boolean().nullish(),
        hideFromAddressLists: z.boolean().nullish(),
        hideFromOutlookClients: z.boolean().nullish(),
        isArchived: z.boolean().nullish(),
        isAssignableToRole: z.boolean().nullish(),
        isManagementRestricted: z.boolean().nullish(),
        isSubscribedByMail: z.boolean().nullish(),
        licenseProcessingState: z
          .union([microsoft_graph_licenseProcessingState, z.object({}).partial().passthrough()])
          .optional(),
        mail: z.string().nullish(),
        mailEnabled: z.boolean().nullish(),
        mailNickname: z.string().nullish(),
        membershipRule: z.string().nullish(),
        membershipRuleProcessingState: z.string().nullish(),
        onPremisesDomainName: z.string().nullish(),
        onPremisesLastSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        onPremisesNetBiosName: z.string().nullish(),
        onPremisesProvisioningErrors: z
          .array(microsoft_graph_onPremisesProvisioningError)
          .optional(),
        onPremisesSamAccountName: z.string().nullish(),
        onPremisesSecurityIdentifier: z.string().nullish(),
        onPremisesSyncEnabled: z.boolean().nullish(),
        preferredDataLocation: z.string().nullish(),
        preferredLanguage: z.string().nullish(),
        proxyAddresses: z.array(z.string()).optional(),
        renewedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        securityEnabled: z.boolean().nullish(),
        securityIdentifier: z.string().nullish(),
        serviceProvisioningErrors: z.array(microsoft_graph_serviceProvisioningError).optional(),
        theme: z.string().nullish(),
        uniqueName: z.string().nullish(),
        unseenCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
        visibility: z.string().nullish(),
        acceptedSenders: z.array(microsoft_graph_directoryObject).optional(),
        appRoleAssignments: z.array(microsoft_graph_appRoleAssignment).optional(),
        calendar: z
          .union([microsoft_graph_calendar, z.object({}).partial().passthrough()])
          .optional(),
        calendarView: z.array(microsoft_graph_event).optional(),
        conversations: z.array(microsoft_graph_conversation).optional(),
        createdOnBehalfOf: z
          .union([microsoft_graph_directoryObject, z.object({}).partial().passthrough()])
          .optional(),
        drive: z.union([microsoft_graph_drive, z.object({}).partial().passthrough()]).optional(),
        drives: z.array(microsoft_graph_drive).optional(),
        events: z.array(microsoft_graph_event).optional(),
        extensions: z.array(microsoft_graph_extension).optional(),
        groupLifecyclePolicies: z.array(microsoft_graph_groupLifecyclePolicy).optional(),
        memberOf: z.array(microsoft_graph_directoryObject).optional(),
        members: z.array(microsoft_graph_directoryObject).optional(),
        membersWithLicenseErrors: z.array(microsoft_graph_directoryObject).optional(),
        onenote: z
          .union([microsoft_graph_onenote, z.object({}).partial().passthrough()])
          .optional(),
        owners: z.array(microsoft_graph_directoryObject).optional(),
        permissionGrants: z.array(microsoft_graph_resourceSpecificPermissionGrant).optional(),
        photo: z
          .union([microsoft_graph_profilePhoto, z.object({}).partial().passthrough()])
          .optional(),
        photos: z.array(microsoft_graph_profilePhoto).optional(),
        planner: z
          .union([microsoft_graph_plannerGroup, z.object({}).partial().passthrough()])
          .optional(),
        rejectedSenders: z.array(microsoft_graph_directoryObject).optional(),
        settings: z.array(microsoft_graph_groupSetting).optional(),
        sites: z.array(microsoft_graph_site).optional(),
        team: z.union([microsoft_graph_team, z.object({}).partial().passthrough()]).optional(),
        threads: z.array(microsoft_graph_conversationThread).optional(),
        transitiveMemberOf: z.array(microsoft_graph_directoryObject).optional(),
        transitiveMembers: z.array(microsoft_graph_directoryObject).optional(),
        '@odata.type': z.string().default('#microsoft.graph.group'),
      })
      .passthrough()
  )
);
const microsoft_graph_printConnector = microsoft_graph_entity.and(
  z
    .object({
      appVersion: z.string().optional(),
      displayName: z.string().optional(),
      fullyQualifiedDomainName: z.string().optional(),
      location: z
        .union([microsoft_graph_printerLocation, z.object({}).partial().passthrough()])
        .optional(),
      operatingSystem: z.string().optional(),
      registeredDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_printer: z.ZodType<microsoft_graph_printer> = z.lazy(() =>
  microsoft_graph_printerBase.and(
    z
      .object({
        hasPhysicalDevice: z.boolean().optional(),
        isShared: z.boolean().optional(),
        lastSeenDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        registeredDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        connectors: z.array(microsoft_graph_printConnector).optional(),
        shares: z.array(microsoft_graph_printerShare).optional(),
        taskTriggers: z.array(microsoft_graph_printTaskTrigger).optional(),
        '@odata.type': z.string().default('#microsoft.graph.printer'),
      })
      .passthrough()
  )
);
const microsoft_graph_printerShare: z.ZodType<microsoft_graph_printerShare> = z.lazy(() =>
  microsoft_graph_printerBase.and(
    z
      .object({
        allowAllUsers: z.boolean().optional(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        viewPoint: z
          .union([microsoft_graph_printerShareViewpoint, z.object({}).partial().passthrough()])
          .optional(),
        allowedGroups: z.array(microsoft_graph_group).optional(),
        allowedUsers: z.array(microsoft_graph_user).optional(),
        printer: z
          .union([microsoft_graph_printer, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string().default('#microsoft.graph.printerShare'),
      })
      .passthrough()
  )
);
const microsoft_graph_userPrint: z.ZodType<microsoft_graph_userPrint> = z.lazy(() =>
  z
    .object({
      recentPrinterShares: z.array(microsoft_graph_printerShare).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_provisionedPlan = z
  .object({
    capabilityStatus: z.string().nullish(),
    provisioningStatus: z.string().nullish(),
    service: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_signInActivity = z
  .object({
    lastNonInteractiveSignInDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    lastNonInteractiveSignInRequestId: z.string().nullish(),
    lastSignInDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    lastSignInRequestId: z.string().nullish(),
    lastSuccessfulSignInDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    lastSuccessfulSignInRequestId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_status = z.enum([
  'active',
  'updated',
  'deleted',
  'ignored',
  'unknownFutureValue',
]);
const microsoft_graph_imageInfo = z
  .object({
    addImageQuery: z.boolean().nullish(),
    alternateText: z.string().nullish(),
    alternativeText: z.string().nullish(),
    iconUrl: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_visualInfo = z
  .object({
    attribution: z
      .union([microsoft_graph_imageInfo, z.object({}).partial().passthrough()])
      .optional(),
    backgroundColor: z.string().nullish(),
    content: z.unknown().optional(),
    description: z.string().nullish(),
    displayText: z.string().optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_activityHistoryItem: z.ZodType<microsoft_graph_activityHistoryItem> = z.lazy(
  () =>
    microsoft_graph_entity.and(
      z
        .object({
          activeDurationSeconds: z.number().gte(-2147483648).lte(2147483647).nullish(),
          createdDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .nullish(),
          expirationDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .nullish(),
          lastActiveDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .nullish(),
          lastModifiedDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .nullish(),
          startedDateTime: z
            .string()
            .regex(
              /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
            )
            .datetime({ offset: true })
            .optional(),
          status: z
            .union([microsoft_graph_status, z.object({}).partial().passthrough()])
            .optional(),
          userTimezone: z.string().nullish(),
          activity: microsoft_graph_userActivity.optional(),
          '@odata.type': z.string(),
        })
        .passthrough()
    )
);
const microsoft_graph_userActivity: z.ZodType<microsoft_graph_userActivity> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        activationUrl: z.string().optional(),
        activitySourceHost: z.string().optional(),
        appActivityId: z.string().optional(),
        appDisplayName: z.string().nullish(),
        contentInfo: z.unknown().optional(),
        contentUrl: z.string().nullish(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        expirationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        fallbackUrl: z.string().nullish(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        status: z.union([microsoft_graph_status, z.object({}).partial().passthrough()]).optional(),
        userTimezone: z.string().nullish(),
        visualElements: microsoft_graph_visualInfo.optional(),
        historyItems: z.array(microsoft_graph_activityHistoryItem).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
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
      agreementFileId: z.string().nullish(),
      agreementId: z.string().nullish(),
      deviceDisplayName: z.string().nullish(),
      deviceId: z.string().nullish(),
      deviceOSType: z.string().nullish(),
      deviceOSVersion: z.string().nullish(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      recordedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      state: z
        .union([microsoft_graph_agreementAcceptanceState, z.object({}).partial().passthrough()])
        .optional(),
      userDisplayName: z.string().nullish(),
      userEmail: z.string().nullish(),
      userId: z.string().nullish(),
      userPrincipalName: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_authenticationMethod = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_emailAuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      emailAddress: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.emailAuthenticationMethod'),
    })
    .passthrough()
);
const microsoft_graph_attestationLevel = z.enum(['attested', 'notAttested', 'unknownFutureValue']);
const microsoft_graph_fido2AuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      aaGuid: z.string().nullish(),
      attestationCertificates: z.array(z.string().nullable()).optional(),
      attestationLevel: z
        .union([microsoft_graph_attestationLevel, z.object({}).partial().passthrough()])
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      displayName: z.string().nullish(),
      model: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.fido2AuthenticationMethod'),
    })
    .passthrough()
);
const microsoft_graph_alternativeSecurityId = z
  .object({
    identityProvider: z.string().nullish(),
    key: z.string().nullish(),
    type: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_device = microsoft_graph_directoryObject.and(
  z
    .object({
      accountEnabled: z.boolean().nullish(),
      alternativeSecurityIds: z.array(microsoft_graph_alternativeSecurityId).optional(),
      approximateLastSignInDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      complianceExpirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      deviceCategory: z.string().nullish(),
      deviceId: z.string().nullish(),
      deviceMetadata: z.string().nullish(),
      deviceOwnership: z.string().nullish(),
      deviceVersion: z.number().gte(-2147483648).lte(2147483647).nullish(),
      displayName: z.string().nullish(),
      enrollmentProfileName: z.string().nullish(),
      enrollmentType: z.string().nullish(),
      isCompliant: z.boolean().nullish(),
      isManaged: z.boolean().nullish(),
      isManagementRestricted: z.boolean().nullish(),
      isRooted: z.boolean().nullish(),
      managementType: z.string().nullish(),
      manufacturer: z.string().nullish(),
      mdmAppId: z.string().nullish(),
      model: z.string().nullish(),
      onPremisesLastSyncDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      onPremisesSecurityIdentifier: z.string().nullish(),
      onPremisesSyncEnabled: z.boolean().nullish(),
      operatingSystem: z.string().nullish(),
      operatingSystemVersion: z.string().nullish(),
      physicalIds: z.array(z.string()).optional(),
      profileType: z.string().nullish(),
      registrationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      systemLabels: z.array(z.string()).optional(),
      trustType: z.string().nullish(),
      extensions: z.array(microsoft_graph_extension).optional(),
      memberOf: z.array(microsoft_graph_directoryObject).optional(),
      registeredOwners: z.array(microsoft_graph_directoryObject).optional(),
      registeredUsers: z.array(microsoft_graph_directoryObject).optional(),
      transitiveMemberOf: z.array(microsoft_graph_directoryObject).optional(),
      '@odata.type': z.string().default('#microsoft.graph.device'),
    })
    .passthrough()
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
          .nullish(),
        deviceTag: z.string().nullish(),
        displayName: z.string().nullish(),
        phoneAppVersion: z.string().nullish(),
        device: z.union([microsoft_graph_device, z.object({}).partial().passthrough()]).optional(),
        '@odata.type': z
          .string()
          .default('#microsoft.graph.microsoftAuthenticatorAuthenticationMethod'),
      })
      .passthrough()
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
        .nullish(),
      password: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.passwordAuthenticationMethod'),
    })
    .passthrough()
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
      phoneNumber: z.string().nullish(),
      phoneType: z
        .union([microsoft_graph_authenticationPhoneType, z.object({}).partial().passthrough()])
        .optional(),
      smsSignInState: z
        .union([
          microsoft_graph_authenticationMethodSignInState,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.phoneAuthenticationMethod'),
    })
    .passthrough()
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
          .nullish(),
        displayName: z.string().nullish(),
        keyStrength: z
          .union([
            microsoft_graph_authenticationMethodKeyStrength,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        platform: z
          .union([
            microsoft_graph_authenticationMethodPlatform,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        device: z.union([microsoft_graph_device, z.object({}).partial().passthrough()]).optional(),
        '@odata.type': z
          .string()
          .default('#microsoft.graph.platformCredentialAuthenticationMethod'),
      })
      .passthrough()
  );
const microsoft_graph_softwareOathAuthenticationMethod = microsoft_graph_authenticationMethod.and(
  z
    .object({
      secretKey: z.string().nullish(),
      '@odata.type': z.string().default('#microsoft.graph.softwareOathAuthenticationMethod'),
    })
    .passthrough()
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
          .nullish(),
        isUsable: z.boolean().nullish(),
        isUsableOnce: z.boolean().nullish(),
        lifetimeInMinutes: z.number().gte(-2147483648).lte(2147483647).nullish(),
        methodUsabilityReason: z.string().nullish(),
        startDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        temporaryAccessPass: z.string().nullish(),
        '@odata.type': z
          .string()
          .default('#microsoft.graph.temporaryAccessPassAuthenticationMethod'),
      })
      .passthrough()
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
          .nullish(),
        displayName: z.string().nullish(),
        keyStrength: z
          .union([
            microsoft_graph_authenticationMethodKeyStrength,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        device: z.union([microsoft_graph_device, z.object({}).partial().passthrough()]).optional(),
        '@odata.type': z
          .string()
          .default('#microsoft.graph.windowsHelloForBusinessAuthenticationMethod'),
      })
      .passthrough()
  );
const microsoft_graph_authentication = microsoft_graph_entity.and(
  z
    .object({
      emailMethods: z.array(microsoft_graph_emailAuthenticationMethod).optional(),
      fido2Methods: z.array(microsoft_graph_fido2AuthenticationMethod).optional(),
      methods: z.array(microsoft_graph_authenticationMethod).optional(),
      microsoftAuthenticatorMethods: z
        .array(microsoft_graph_microsoftAuthenticatorAuthenticationMethod)
        .optional(),
      operations: z.array(microsoft_graph_longRunningOperation).optional(),
      passwordMethods: z.array(microsoft_graph_passwordAuthenticationMethod).optional(),
      phoneMethods: z.array(microsoft_graph_phoneAuthenticationMethod).optional(),
      platformCredentialMethods: z
        .array(microsoft_graph_platformCredentialAuthenticationMethod)
        .optional(),
      softwareOathMethods: z.array(microsoft_graph_softwareOathAuthenticationMethod).optional(),
      temporaryAccessPassMethods: z
        .array(microsoft_graph_temporaryAccessPassAuthenticationMethod)
        .optional(),
      windowsHelloForBusinessMethods: z
        .array(microsoft_graph_windowsHelloForBusinessAuthenticationMethod)
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_calendarGroup = microsoft_graph_entity.and(
  z
    .object({
      changeKey: z.string().nullish(),
      classId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .nullish(),
      name: z.string().nullish(),
      calendars: z.array(microsoft_graph_calendar).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
        .union([microsoft_graph_teamworkUserIdentityType, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.teamworkUserIdentity'),
    })
    .passthrough()
);
const microsoft_graph_teamworkOnlineMeetingInfo = z
  .object({
    calendarEventId: z.string().nullish(),
    joinWebUrl: z.string().nullish(),
    organizer: z
      .union([microsoft_graph_teamworkUserIdentity, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_chatViewpoint = z
  .object({
    isHidden: z.boolean().nullish(),
    lastMessageReadDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_chatMessageInfo = microsoft_graph_entity.and(
  z
    .object({
      body: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      eventDetail: z
        .union([microsoft_graph_eventMessageDetail, z.object({}).partial().passthrough()])
        .optional(),
      from: z
        .union([microsoft_graph_chatMessageFromIdentitySet, z.object({}).partial().passthrough()])
        .optional(),
      isDeleted: z.boolean().nullish(),
      messageType: microsoft_graph_chatMessageType.optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_pinnedChatMessageInfo = microsoft_graph_entity.and(
  z
    .object({
      message: z
        .union([microsoft_graph_chatMessage, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_chat = microsoft_graph_entity.and(
  z
    .object({
      chatType: microsoft_graph_chatType.optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      isHiddenForAllMembers: z.boolean().nullish(),
      lastUpdatedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      onlineMeetingInfo: z
        .union([microsoft_graph_teamworkOnlineMeetingInfo, z.object({}).partial().passthrough()])
        .optional(),
      tenantId: z.string().nullish(),
      topic: z.string().nullish(),
      viewpoint: z
        .union([microsoft_graph_chatViewpoint, z.object({}).partial().passthrough()])
        .optional(),
      webUrl: z.string().nullish(),
      installedApps: z.array(microsoft_graph_teamsAppInstallation).optional(),
      lastMessagePreview: z
        .union([microsoft_graph_chatMessageInfo, z.object({}).partial().passthrough()])
        .optional(),
      members: z.array(microsoft_graph_conversationMember).optional(),
      messages: z.array(microsoft_graph_chatMessage).optional(),
      permissionGrants: z.array(microsoft_graph_resourceSpecificPermissionGrant).optional(),
      pinnedMessages: z.array(microsoft_graph_pinnedChatMessageInfo).optional(),
      tabs: z.array(microsoft_graph_teamsTab).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_cloudClipboardItemPayload = z
  .object({
    content: z.string().optional(),
    formatName: z.string().optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_cloudClipboardItem = microsoft_graph_entity.and(
  z
    .object({
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      payloads: z.array(microsoft_graph_cloudClipboardItemPayload).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_cloudClipboardRoot = microsoft_graph_entity.and(
  z
    .object({
      items: z.array(microsoft_graph_cloudClipboardItem).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_contact = microsoft_graph_outlookItem.and(
  z
    .object({
      assistantName: z.string().nullish(),
      birthday: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      businessAddress: z
        .union([microsoft_graph_physicalAddress, z.object({}).partial().passthrough()])
        .optional(),
      businessHomePage: z.string().nullish(),
      businessPhones: z.array(z.string().nullable()).optional(),
      children: z.array(z.string().nullable()).optional(),
      companyName: z.string().nullish(),
      department: z.string().nullish(),
      displayName: z.string().nullish(),
      emailAddresses: z.array(microsoft_graph_emailAddress).optional(),
      fileAs: z.string().nullish(),
      generation: z.string().nullish(),
      givenName: z.string().nullish(),
      homeAddress: z
        .union([microsoft_graph_physicalAddress, z.object({}).partial().passthrough()])
        .optional(),
      homePhones: z.array(z.string().nullable()).optional(),
      imAddresses: z.array(z.string().nullable()).optional(),
      initials: z.string().nullish(),
      jobTitle: z.string().nullish(),
      manager: z.string().nullish(),
      middleName: z.string().nullish(),
      mobilePhone: z.string().nullish(),
      nickName: z.string().nullish(),
      officeLocation: z.string().nullish(),
      otherAddress: z
        .union([microsoft_graph_physicalAddress, z.object({}).partial().passthrough()])
        .optional(),
      parentFolderId: z.string().nullish(),
      personalNotes: z.string().nullish(),
      profession: z.string().nullish(),
      spouseName: z.string().nullish(),
      surname: z.string().nullish(),
      title: z.string().nullish(),
      yomiCompanyName: z.string().nullish(),
      yomiGivenName: z.string().nullish(),
      yomiSurname: z.string().nullish(),
      extensions: z.array(microsoft_graph_extension).optional(),
      multiValueExtendedProperties: z
        .array(microsoft_graph_multiValueLegacyExtendedProperty)
        .optional(),
      photo: z
        .union([microsoft_graph_profilePhoto, z.object({}).partial().passthrough()])
        .optional(),
      singleValueExtendedProperties: z
        .array(microsoft_graph_singleValueLegacyExtendedProperty)
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.contact'),
    })
    .passthrough()
);
const microsoft_graph_contactFolder: z.ZodType<microsoft_graph_contactFolder> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        displayName: z.string().nullish(),
        parentFolderId: z.string().nullish(),
        childFolders: z.array(microsoft_graph_contactFolder).optional(),
        contacts: z.array(microsoft_graph_contact).optional(),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .optional(),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_deviceManagementTroubleshootingEvent = microsoft_graph_entity.and(
  z
    .object({
      correlationId: z.string().nullish(),
      eventDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
        .nullish(),
      completionPercentage: z.number().gte(-2147483648).lte(2147483647).nullish(),
      externalcourseActivityId: z.string().nullish(),
      learnerUserId: z.string().optional(),
      learningContentId: z.string().optional(),
      learningProviderId: z.string().nullish(),
      status: z
        .union([microsoft_graph_courseStatus, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_employeeExperienceUser = microsoft_graph_entity.and(
  z
    .object({
      learningCourseActivities: z.array(microsoft_graph_learningCourseActivity).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_inferenceClassificationType = z.enum(['focused', 'other']);
const microsoft_graph_inferenceClassificationOverride = microsoft_graph_entity.and(
  z
    .object({
      classifyAs: z
        .union([microsoft_graph_inferenceClassificationType, z.object({}).partial().passthrough()])
        .optional(),
      senderEmailAddress: z
        .union([microsoft_graph_emailAddress, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_inferenceClassification = microsoft_graph_entity.and(
  z
    .object({
      overrides: z.array(microsoft_graph_inferenceClassificationOverride).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_insightIdentity = z
  .object({
    address: z.string().nullish(),
    displayName: z.string().nullish(),
    id: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_resourceReference = z
  .object({
    id: z.string().nullish(),
    type: z.string().nullish(),
    webUrl: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_sharingDetail = z
  .object({
    sharedBy: z
      .union([microsoft_graph_insightIdentity, z.object({}).partial().passthrough()])
      .optional(),
    sharedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    sharingReference: z
      .union([microsoft_graph_resourceReference, z.object({}).partial().passthrough()])
      .optional(),
    sharingSubject: z.string().nullish(),
    sharingType: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_resourceVisualization = z
  .object({
    containerDisplayName: z.string().nullish(),
    containerType: z.string().nullish(),
    containerWebUrl: z.string().nullish(),
    mediaType: z.string().nullish(),
    previewImageUrl: z.string().nullish(),
    previewText: z.string().nullish(),
    title: z.string().nullish(),
    type: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_sharedInsight = microsoft_graph_entity.and(
  z
    .object({
      lastShared: z
        .union([microsoft_graph_sharingDetail, z.object({}).partial().passthrough()])
        .optional(),
      resourceReference: z
        .union([microsoft_graph_resourceReference, z.object({}).partial().passthrough()])
        .optional(),
      resourceVisualization: z
        .union([microsoft_graph_resourceVisualization, z.object({}).partial().passthrough()])
        .optional(),
      sharingHistory: z.array(microsoft_graph_sharingDetail).optional(),
      lastSharedMethod: z
        .union([microsoft_graph_entity, z.object({}).partial().passthrough()])
        .optional(),
      resource: z.union([microsoft_graph_entity, z.object({}).partial().passthrough()]).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
        .nullish(),
      resourceReference: z
        .union([microsoft_graph_resourceReference, z.object({}).partial().passthrough()])
        .optional(),
      resourceVisualization: z
        .union([microsoft_graph_resourceVisualization, z.object({}).partial().passthrough()])
        .optional(),
      weight: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
      resource: z.union([microsoft_graph_entity, z.object({}).partial().passthrough()]).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_usageDetails = z
  .object({
    lastAccessedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_usedInsight = microsoft_graph_entity.and(
  z
    .object({
      lastUsed: z
        .union([microsoft_graph_usageDetails, z.object({}).partial().passthrough()])
        .optional(),
      resourceReference: z
        .union([microsoft_graph_resourceReference, z.object({}).partial().passthrough()])
        .optional(),
      resourceVisualization: z
        .union([microsoft_graph_resourceVisualization, z.object({}).partial().passthrough()])
        .optional(),
      resource: z.union([microsoft_graph_entity, z.object({}).partial().passthrough()]).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_officeGraphInsights = microsoft_graph_entity.and(
  z
    .object({
      shared: z.array(microsoft_graph_sharedInsight).optional(),
      trending: z.array(microsoft_graph_trending).optional(),
      used: z.array(microsoft_graph_usedInsight).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_itemInsights = microsoft_graph_officeGraphInsights.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_servicePlanInfo = z
  .object({
    appliesTo: z.string().nullish(),
    provisioningStatus: z.string().nullish(),
    servicePlanId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .nullish(),
    servicePlanName: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_licenseDetails = microsoft_graph_entity.and(
  z
    .object({
      servicePlans: z.array(microsoft_graph_servicePlanInfo).optional(),
      skuId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .nullish(),
      skuPartNumber: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_messageRuleActions = z
  .object({
    assignCategories: z.array(z.string().nullable()).optional(),
    copyToFolder: z.string().nullish(),
    delete: z.boolean().nullish(),
    forwardAsAttachmentTo: z.array(microsoft_graph_recipient).optional(),
    forwardTo: z.array(microsoft_graph_recipient).optional(),
    markAsRead: z.boolean().nullish(),
    markImportance: z
      .union([microsoft_graph_importance, z.object({}).partial().passthrough()])
      .optional(),
    moveToFolder: z.string().nullish(),
    permanentDelete: z.boolean().nullish(),
    redirectTo: z.array(microsoft_graph_recipient).optional(),
    stopProcessingRules: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    maximumSize: z.number().gte(-2147483648).lte(2147483647).nullish(),
    minimumSize: z.number().gte(-2147483648).lte(2147483647).nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_messageRulePredicates = z
  .object({
    bodyContains: z.array(z.string().nullable()).optional(),
    bodyOrSubjectContains: z.array(z.string().nullable()).optional(),
    categories: z.array(z.string().nullable()).optional(),
    fromAddresses: z.array(microsoft_graph_recipient).optional(),
    hasAttachments: z.boolean().nullish(),
    headerContains: z.array(z.string().nullable()).optional(),
    importance: z
      .union([microsoft_graph_importance, z.object({}).partial().passthrough()])
      .optional(),
    isApprovalRequest: z.boolean().nullish(),
    isAutomaticForward: z.boolean().nullish(),
    isAutomaticReply: z.boolean().nullish(),
    isEncrypted: z.boolean().nullish(),
    isMeetingRequest: z.boolean().nullish(),
    isMeetingResponse: z.boolean().nullish(),
    isNonDeliveryReport: z.boolean().nullish(),
    isPermissionControlled: z.boolean().nullish(),
    isReadReceipt: z.boolean().nullish(),
    isSigned: z.boolean().nullish(),
    isVoicemail: z.boolean().nullish(),
    messageActionFlag: z
      .union([microsoft_graph_messageActionFlag, z.object({}).partial().passthrough()])
      .optional(),
    notSentToMe: z.boolean().nullish(),
    recipientContains: z.array(z.string().nullable()).optional(),
    senderContains: z.array(z.string().nullable()).optional(),
    sensitivity: z
      .union([microsoft_graph_sensitivity, z.object({}).partial().passthrough()])
      .optional(),
    sentCcMe: z.boolean().nullish(),
    sentOnlyToMe: z.boolean().nullish(),
    sentToAddresses: z.array(microsoft_graph_recipient).optional(),
    sentToMe: z.boolean().nullish(),
    sentToOrCcMe: z.boolean().nullish(),
    subjectContains: z.array(z.string().nullable()).optional(),
    withinSizeRange: z
      .union([microsoft_graph_sizeRange, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_messageRule = microsoft_graph_entity.and(
  z
    .object({
      actions: z
        .union([microsoft_graph_messageRuleActions, z.object({}).partial().passthrough()])
        .optional(),
      conditions: z
        .union([microsoft_graph_messageRulePredicates, z.object({}).partial().passthrough()])
        .optional(),
      displayName: z.string().nullish(),
      exceptions: z
        .union([microsoft_graph_messageRulePredicates, z.object({}).partial().passthrough()])
        .optional(),
      hasError: z.boolean().nullish(),
      isEnabled: z.boolean().nullish(),
      isReadOnly: z.boolean().nullish(),
      sequence: z.number().gte(-2147483648).lte(2147483647).nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_followupFlagStatus = z.enum(['notFlagged', 'complete', 'flagged']);
const microsoft_graph_followupFlag = z
  .object({
    completedDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
      .optional(),
    dueDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
      .optional(),
    flagStatus: z
      .union([microsoft_graph_followupFlagStatus, z.object({}).partial().passthrough()])
      .optional(),
    startDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_internetMessageHeader = z
  .object({ name: z.string().nullish(), value: z.string().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_message = microsoft_graph_outlookItem.and(
  z
    .object({
      bccRecipients: z.array(microsoft_graph_recipient).optional(),
      body: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
      bodyPreview: z.string().nullish(),
      ccRecipients: z.array(microsoft_graph_recipient).optional(),
      conversationId: z.string().nullish(),
      conversationIndex: z.string().nullish(),
      flag: z
        .union([microsoft_graph_followupFlag, z.object({}).partial().passthrough()])
        .optional(),
      from: z.union([microsoft_graph_recipient, z.object({}).partial().passthrough()]).optional(),
      hasAttachments: z.boolean().nullish(),
      importance: z
        .union([microsoft_graph_importance, z.object({}).partial().passthrough()])
        .optional(),
      inferenceClassification: z
        .union([microsoft_graph_inferenceClassificationType, z.object({}).partial().passthrough()])
        .optional(),
      internetMessageHeaders: z.array(microsoft_graph_internetMessageHeader).optional(),
      internetMessageId: z.string().nullish(),
      isDeliveryReceiptRequested: z.boolean().nullish(),
      isDraft: z.boolean().nullish(),
      isRead: z.boolean().nullish(),
      isReadReceiptRequested: z.boolean().nullish(),
      parentFolderId: z.string().nullish(),
      receivedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      replyTo: z.array(microsoft_graph_recipient).optional(),
      sender: z.union([microsoft_graph_recipient, z.object({}).partial().passthrough()]).optional(),
      sentDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      subject: z.string().nullish(),
      toRecipients: z.array(microsoft_graph_recipient).optional(),
      uniqueBody: z
        .union([microsoft_graph_itemBody, z.object({}).partial().passthrough()])
        .optional(),
      webLink: z.string().nullish(),
      attachments: z.array(microsoft_graph_attachment).optional(),
      extensions: z.array(microsoft_graph_extension).optional(),
      multiValueExtendedProperties: z
        .array(microsoft_graph_multiValueLegacyExtendedProperty)
        .optional(),
      singleValueExtendedProperties: z
        .array(microsoft_graph_singleValueLegacyExtendedProperty)
        .optional(),
      '@odata.type': z.string().default('#microsoft.graph.message'),
    })
    .passthrough()
);
const microsoft_graph_mailFolder: z.ZodType<microsoft_graph_mailFolder> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        childFolderCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
        displayName: z.string().nullish(),
        isHidden: z.boolean().nullish(),
        parentFolderId: z.string().nullish(),
        totalItemCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
        unreadItemCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
        childFolders: z.array(microsoft_graph_mailFolder).optional(),
        messageRules: z.array(microsoft_graph_messageRule).optional(),
        messages: z.array(microsoft_graph_message).optional(),
        multiValueExtendedProperties: z
          .array(microsoft_graph_multiValueLegacyExtendedProperty)
          .optional(),
        singleValueExtendedProperties: z
          .array(microsoft_graph_singleValueLegacyExtendedProperty)
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_mobileAppIdentifier = z.object({ '@odata.type': z.string() }).passthrough();
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
        .optional(),
      description: z.string().nullish(),
      displayName: z.string().optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      version: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_managedAppOperation = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      state: z.string().nullish(),
      version: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_managedAppRegistration = microsoft_graph_entity.and(
  z
    .object({
      appIdentifier: z
        .union([microsoft_graph_mobileAppIdentifier, z.object({}).partial().passthrough()])
        .optional(),
      applicationVersion: z.string().nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      deviceName: z.string().nullish(),
      deviceTag: z.string().nullish(),
      deviceType: z.string().nullish(),
      flaggedReasons: z.array(microsoft_graph_managedAppFlaggedReason).optional(),
      lastSyncDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      managementSdkVersion: z.string().nullish(),
      platformVersion: z.string().nullish(),
      userId: z.string().nullish(),
      version: z.string().nullish(),
      appliedPolicies: z.array(microsoft_graph_managedAppPolicy).optional(),
      intendedPolicies: z.array(microsoft_graph_managedAppPolicy).optional(),
      operations: z.array(microsoft_graph_managedAppOperation).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
    compliancePolicy: z.boolean().optional(),
    deviceConfiguration: z.boolean().optional(),
    inventory: z.boolean().optional(),
    modernApps: z.boolean().optional(),
    resourceAccess: z.boolean().optional(),
    windowsUpdateForBusiness: z.boolean().optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    actionName: z.string().nullish(),
    actionState: microsoft_graph_actionState.optional(),
    lastUpdatedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .optional(),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    attestationIdentityKey: z.string().nullish(),
    bitLockerStatus: z.string().nullish(),
    bootAppSecurityVersion: z.string().nullish(),
    bootDebugging: z.string().nullish(),
    bootManagerSecurityVersion: z.string().nullish(),
    bootManagerVersion: z.string().nullish(),
    bootRevisionListInfo: z.string().nullish(),
    codeIntegrity: z.string().nullish(),
    codeIntegrityCheckVersion: z.string().nullish(),
    codeIntegrityPolicy: z.string().nullish(),
    contentNamespaceUrl: z.string().nullish(),
    contentVersion: z.string().nullish(),
    dataExcutionPolicy: z.string().nullish(),
    deviceHealthAttestationStatus: z.string().nullish(),
    earlyLaunchAntiMalwareDriverProtection: z.string().nullish(),
    healthAttestationSupportedStatus: z.string().nullish(),
    healthStatusMismatchInfo: z.string().nullish(),
    issuedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .optional(),
    lastUpdateDateTime: z.string().nullish(),
    operatingSystemKernelDebugging: z.string().nullish(),
    operatingSystemRevListInfo: z.string().nullish(),
    pcr0: z.string().nullish(),
    pcrHashAlgorithm: z.string().nullish(),
    resetCount: z.number().optional(),
    restartCount: z.number().optional(),
    safeMode: z.string().nullish(),
    secureBoot: z.string().nullish(),
    secureBootConfigurationPolicyFingerPrint: z.string().nullish(),
    testSigning: z.string().nullish(),
    tpmVersion: z.string().nullish(),
    virtualSecureMode: z.string().nullish(),
    windowsPE: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
      description: z.string().nullish(),
      displayName: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
    displayName: z.string().nullish(),
    id: z.string().nullish(),
    sourceType: microsoft_graph_settingSourceType.optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    currentValue: z.string().nullish(),
    errorCode: z.number().optional(),
    errorDescription: z.string().nullish(),
    instanceDisplayName: z.string().nullish(),
    setting: z.string().nullish(),
    settingName: z.string().nullish(),
    sources: z.array(microsoft_graph_settingSource).optional(),
    state: microsoft_graph_complianceStatus.optional(),
    userEmail: z.string().nullish(),
    userId: z.string().nullish(),
    userName: z.string().nullish(),
    userPrincipalName: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_deviceCompliancePolicyState = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      platformType: microsoft_graph_policyPlatformType.optional(),
      settingCount: z.number().gte(-2147483648).lte(2147483647).optional(),
      settingStates: z.array(microsoft_graph_deviceCompliancePolicySettingState).optional(),
      state: microsoft_graph_complianceStatus.optional(),
      version: z.number().gte(-2147483648).lte(2147483647).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_deviceConfigurationSettingState = z
  .object({
    currentValue: z.string().nullish(),
    errorCode: z.number().optional(),
    errorDescription: z.string().nullish(),
    instanceDisplayName: z.string().nullish(),
    setting: z.string().nullish(),
    settingName: z.string().nullish(),
    sources: z.array(microsoft_graph_settingSource).optional(),
    state: microsoft_graph_complianceStatus.optional(),
    userEmail: z.string().nullish(),
    userId: z.string().nullish(),
    userName: z.string().nullish(),
    userPrincipalName: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_deviceConfigurationState = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      platformType: microsoft_graph_policyPlatformType.optional(),
      settingCount: z.number().gte(-2147483648).lte(2147483647).optional(),
      settingStates: z.array(microsoft_graph_deviceConfigurationSettingState).optional(),
      state: microsoft_graph_complianceStatus.optional(),
      version: z.number().gte(-2147483648).lte(2147483647).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
      enrolledByUser: z.string().nullish(),
      expirationDateTimeUTC: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      initiatedByUserPrincipalName: z.string().nullish(),
      managedDeviceId: z
        .string()
        .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
        .uuid()
        .optional(),
      receivedDateTimeUTC: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      requestedDateTimeUTC: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      sizeInKB: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
      status: microsoft_graph_appLogUploadState.optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
      additionalInformationUrl: z.string().nullish(),
      category: z
        .union([microsoft_graph_windowsMalwareCategory, z.object({}).partial().passthrough()])
        .optional(),
      detectionCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
      displayName: z.string().nullish(),
      executionState: z
        .union([microsoft_graph_windowsMalwareExecutionState, z.object({}).partial().passthrough()])
        .optional(),
      initialDetectionDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      lastStateChangeDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      severity: z
        .union([microsoft_graph_windowsMalwareSeverity, z.object({}).partial().passthrough()])
        .optional(),
      state: z
        .union([microsoft_graph_windowsMalwareState, z.object({}).partial().passthrough()])
        .optional(),
      threatState: z
        .union([microsoft_graph_windowsMalwareThreatState, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_windowsProtectionState = microsoft_graph_entity.and(
  z
    .object({
      antiMalwareVersion: z.string().nullish(),
      deviceState: z
        .union([microsoft_graph_windowsDeviceHealthState, z.object({}).partial().passthrough()])
        .optional(),
      engineVersion: z.string().nullish(),
      fullScanOverdue: z.boolean().nullish(),
      fullScanRequired: z.boolean().nullish(),
      isVirtualMachine: z.boolean().nullish(),
      lastFullScanDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      lastFullScanSignatureVersion: z.string().nullish(),
      lastQuickScanDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      lastQuickScanSignatureVersion: z.string().nullish(),
      lastReportedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      malwareProtectionEnabled: z.boolean().nullish(),
      networkInspectionSystemEnabled: z.boolean().nullish(),
      productStatus: z
        .union([microsoft_graph_windowsDefenderProductStatus, z.object({}).partial().passthrough()])
        .optional(),
      quickScanOverdue: z.boolean().nullish(),
      realTimeProtectionEnabled: z.boolean().nullish(),
      rebootRequired: z.boolean().nullish(),
      signatureUpdateOverdue: z.boolean().nullish(),
      signatureVersion: z.string().nullish(),
      tamperProtectionEnabled: z.boolean().nullish(),
      detectedMalwareState: z.array(microsoft_graph_windowsDeviceMalwareState).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_managedDevice: z.ZodType<microsoft_graph_managedDevice> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        activationLockBypassCode: z.string().nullish(),
        androidSecurityPatchLevel: z.string().nullish(),
        azureADDeviceId: z.string().nullish(),
        azureADRegistered: z.boolean().nullish(),
        complianceGracePeriodExpirationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        complianceState: microsoft_graph_complianceState.optional(),
        configurationManagerClientEnabledFeatures: z
          .union([
            microsoft_graph_configurationManagerClientEnabledFeatures,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        deviceActionResults: z.array(microsoft_graph_deviceActionResult).optional(),
        deviceCategoryDisplayName: z.string().nullish(),
        deviceEnrollmentType: microsoft_graph_deviceEnrollmentType.optional(),
        deviceHealthAttestationState: z
          .union([
            microsoft_graph_deviceHealthAttestationState,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        deviceName: z.string().nullish(),
        deviceRegistrationState: microsoft_graph_deviceRegistrationState.optional(),
        easActivated: z.boolean().optional(),
        easActivationDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        easDeviceId: z.string().nullish(),
        emailAddress: z.string().nullish(),
        enrolledDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        enrollmentProfileName: z.string().nullish(),
        ethernetMacAddress: z.string().nullish(),
        exchangeAccessState: microsoft_graph_deviceManagementExchangeAccessState.optional(),
        exchangeAccessStateReason:
          microsoft_graph_deviceManagementExchangeAccessStateReason.optional(),
        exchangeLastSuccessfulSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        freeStorageSpaceInBytes: z.number().optional(),
        iccid: z.string().nullish(),
        imei: z.string().nullish(),
        isEncrypted: z.boolean().optional(),
        isSupervised: z.boolean().optional(),
        jailBroken: z.string().nullish(),
        lastSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        managedDeviceName: z.string().nullish(),
        managedDeviceOwnerType: microsoft_graph_managedDeviceOwnerType.optional(),
        managementAgent: microsoft_graph_managementAgentType.optional(),
        managementCertificateExpirationDate: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        manufacturer: z.string().nullish(),
        meid: z.string().nullish(),
        model: z.string().nullish(),
        notes: z.string().nullish(),
        operatingSystem: z.string().nullish(),
        osVersion: z.string().nullish(),
        partnerReportedThreatState:
          microsoft_graph_managedDevicePartnerReportedHealthState.optional(),
        phoneNumber: z.string().nullish(),
        physicalMemoryInBytes: z.number().optional(),
        remoteAssistanceSessionErrorDetails: z.string().nullish(),
        remoteAssistanceSessionUrl: z.string().nullish(),
        requireUserEnrollmentApproval: z.boolean().nullish(),
        serialNumber: z.string().nullish(),
        subscriberCarrier: z.string().nullish(),
        totalStorageSpaceInBytes: z.number().optional(),
        udid: z.string().nullish(),
        userDisplayName: z.string().nullish(),
        userId: z.string().nullish(),
        userPrincipalName: z.string().nullish(),
        wiFiMacAddress: z.string().nullish(),
        deviceCategory: z
          .union([microsoft_graph_deviceCategory, z.object({}).partial().passthrough()])
          .optional(),
        deviceCompliancePolicyStates: z
          .array(microsoft_graph_deviceCompliancePolicyState)
          .optional(),
        deviceConfigurationStates: z.array(microsoft_graph_deviceConfigurationState).optional(),
        logCollectionRequests: z.array(microsoft_graph_deviceLogCollectionResponse).optional(),
        users: z.array(microsoft_graph_user).optional(),
        windowsProtectionState: z
          .union([microsoft_graph_windowsProtectionState, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_oAuth2PermissionGrant = microsoft_graph_entity.and(
  z
    .object({
      clientId: z.string().optional(),
      consentType: z.string().nullish(),
      principalId: z.string().nullish(),
      resourceId: z.string().optional(),
      scope: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
    conferenceId: z.string().nullish(),
    dialinUrl: z.string().nullish(),
    tollFreeNumber: z.string().nullish(),
    tollFreeNumbers: z.array(z.string().nullable()).optional(),
    tollNumber: z.string().nullish(),
    tollNumbers: z.array(z.string().nullable()).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_chatInfo = z
  .object({
    messageId: z.string().nullish(),
    replyChainMessageId: z.string().nullish(),
    threadId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_chatRestrictions = z
  .object({ allowTextOnly: z.boolean().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_joinMeetingIdSettings = z
  .object({
    isPasscodeRequired: z.boolean().nullish(),
    joinMeetingId: z.string().nullish(),
    passcode: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
    isDialInBypassEnabled: z.boolean().nullish(),
    scope: z
      .union([microsoft_graph_lobbyBypassScope, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_meetingChatHistoryDefaultMode = z.enum(['none', 'all', 'unknownFutureValue']);
const microsoft_graph_watermarkProtectionValues = z
  .object({
    isEnabledForContentSharing: z.boolean().nullish(),
    isEnabledForVideo: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_virtualEventExternalInformation = z
  .object({
    applicationId: z.string().nullish(),
    externalEventId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_attendanceInterval = z
  .object({
    durationInSeconds: z.number().gte(-2147483648).lte(2147483647).nullish(),
    joinDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    leaveDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_virtualEventExternalRegistrationInformation = z
  .object({
    referrer: z.string().nullish(),
    registrationId: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_attendanceRecord = microsoft_graph_entity.and(
  z
    .object({
      attendanceIntervals: z.array(microsoft_graph_attendanceInterval).optional(),
      emailAddress: z.string().nullish(),
      externalRegistrationInformation: z
        .union([
          microsoft_graph_virtualEventExternalRegistrationInformation,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      identity: z
        .union([microsoft_graph_identity, z.object({}).partial().passthrough()])
        .optional(),
      registrationId: z.string().nullish(),
      role: z.string().nullish(),
      totalAttendanceInSeconds: z.number().gte(-2147483648).lte(2147483647).nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_meetingAttendanceReport = microsoft_graph_entity.and(
  z
    .object({
      externalEventInformation: z.array(microsoft_graph_virtualEventExternalInformation).optional(),
      meetingEndDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      meetingStartDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      totalParticipantCount: z.number().gte(-2147483648).lte(2147483647).nullish(),
      attendanceRecords: z.array(microsoft_graph_attendanceRecord).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_onlineMeetingBase = microsoft_graph_entity.and(
  z
    .object({
      allowAttendeeToEnableCamera: z.boolean().nullish(),
      allowAttendeeToEnableMic: z.boolean().nullish(),
      allowBreakoutRooms: z.boolean().nullish(),
      allowedLobbyAdmitters: z
        .union([microsoft_graph_allowedLobbyAdmitterRoles, z.object({}).partial().passthrough()])
        .optional(),
      allowedPresenters: z
        .union([microsoft_graph_onlineMeetingPresenters, z.object({}).partial().passthrough()])
        .optional(),
      allowLiveShare: z
        .union([microsoft_graph_meetingLiveShareOptions, z.object({}).partial().passthrough()])
        .optional(),
      allowMeetingChat: z
        .union([microsoft_graph_meetingChatMode, z.object({}).partial().passthrough()])
        .optional(),
      allowParticipantsToChangeName: z.boolean().nullish(),
      allowPowerPointSharing: z.boolean().nullish(),
      allowRecording: z.boolean().nullish(),
      allowTeamworkReactions: z.boolean().nullish(),
      allowTranscription: z.boolean().nullish(),
      allowWhiteboard: z.boolean().nullish(),
      audioConferencing: z
        .union([microsoft_graph_audioConferencing, z.object({}).partial().passthrough()])
        .optional(),
      chatInfo: z
        .union([microsoft_graph_chatInfo, z.object({}).partial().passthrough()])
        .optional(),
      chatRestrictions: z
        .union([microsoft_graph_chatRestrictions, z.object({}).partial().passthrough()])
        .optional(),
      isEntryExitAnnounced: z.boolean().nullish(),
      joinInformation: z
        .union([microsoft_graph_itemBody, z.object({}).partial().passthrough()])
        .optional(),
      joinMeetingIdSettings: z
        .union([microsoft_graph_joinMeetingIdSettings, z.object({}).partial().passthrough()])
        .optional(),
      joinWebUrl: z.string().nullish(),
      lobbyBypassSettings: z
        .union([microsoft_graph_lobbyBypassSettings, z.object({}).partial().passthrough()])
        .optional(),
      recordAutomatically: z.boolean().nullish(),
      shareMeetingChatHistoryDefault: z
        .union([
          microsoft_graph_meetingChatHistoryDefaultMode,
          z.object({}).partial().passthrough(),
        ])
        .optional(),
      subject: z.string().nullish(),
      videoTeleconferenceId: z.string().nullish(),
      watermarkProtection: z
        .union([microsoft_graph_watermarkProtectionValues, z.object({}).partial().passthrough()])
        .optional(),
      attendanceReports: z.array(microsoft_graph_meetingAttendanceReport).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_broadcastMeetingAudience = z.enum([
  'roleIsAttendee',
  'organization',
  'everyone',
  'unknownFutureValue',
]);
const microsoft_graph_broadcastMeetingCaptionSettings = z
  .object({
    isCaptionEnabled: z.boolean().nullish(),
    spokenLanguage: z.string().nullish(),
    translationLanguages: z.array(z.string().nullable()).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_broadcastMeetingSettings = z
  .object({
    allowedAudience: z
      .union([microsoft_graph_broadcastMeetingAudience, z.object({}).partial().passthrough()])
      .optional(),
    captions: z
      .union([
        microsoft_graph_broadcastMeetingCaptionSettings,
        z.object({}).partial().passthrough(),
      ])
      .optional(),
    isAttendeeReportEnabled: z.boolean().nullish(),
    isQuestionAndAnswerEnabled: z.boolean().nullish(),
    isRecordingEnabled: z.boolean().nullish(),
    isVideoOnDemandEnabled: z.boolean().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
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
      .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
      .optional(),
    role: z
      .union([microsoft_graph_onlineMeetingRole, z.object({}).partial().passthrough()])
      .optional(),
    upn: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_meetingParticipants = z
  .object({
    attendees: z.array(microsoft_graph_meetingParticipantInfo).optional(),
    organizer: z
      .union([microsoft_graph_meetingParticipantInfo, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_callRecording = microsoft_graph_entity.and(
  z
    .object({
      callId: z.string().nullish(),
      content: z.string().nullish(),
      contentCorrelationId: z.string().nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      endDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      meetingId: z.string().nullish(),
      meetingOrganizer: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      recordingContentUrl: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_callTranscript = microsoft_graph_entity.and(
  z
    .object({
      callId: z.string().nullish(),
      content: z.string().nullish(),
      contentCorrelationId: z.string().nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      endDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      meetingId: z.string().nullish(),
      meetingOrganizer: z
        .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
        .optional(),
      metadataContent: z.string().nullish(),
      transcriptContentUrl: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_onlineMeeting = microsoft_graph_onlineMeetingBase.and(
  z
    .object({
      attendeeReport: z.string().nullish(),
      broadcastSettings: z
        .union([microsoft_graph_broadcastMeetingSettings, z.object({}).partial().passthrough()])
        .optional(),
      creationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      endDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      externalId: z.string().nullish(),
      isBroadcast: z.boolean().nullish(),
      meetingTemplateId: z.string().nullish(),
      participants: z
        .union([microsoft_graph_meetingParticipants, z.object({}).partial().passthrough()])
        .optional(),
      startDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      recordings: z.array(microsoft_graph_callRecording).optional(),
      transcripts: z.array(microsoft_graph_callTranscript).optional(),
      '@odata.type': z.string().default('#microsoft.graph.onlineMeeting'),
    })
    .passthrough()
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
        .union([microsoft_graph_categoryColor, z.object({}).partial().passthrough()])
        .optional(),
      displayName: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_outlookUser = microsoft_graph_entity.and(
  z
    .object({
      masterCategories: z.array(microsoft_graph_outlookCategory).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_personType = z
  .object({
    class: z.string().nullish(),
    subclass: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_selectionLikelihoodInfo = z.enum(['notSpecified', 'high']);
const microsoft_graph_scoredEmailAddress = z
  .object({
    address: z.string().nullish(),
    itemId: z.string().nullish(),
    relevanceScore: z.union([z.number(), z.string(), ReferenceNumeric]).optional(),
    selectionLikelihood: z
      .union([microsoft_graph_selectionLikelihoodInfo, z.object({}).partial().passthrough()])
      .optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_websiteType = z.enum(['other', 'home', 'work', 'blog', 'profile']);
const microsoft_graph_website = z
  .object({
    address: z.string().nullish(),
    displayName: z.string().nullish(),
    type: z.union([microsoft_graph_websiteType, z.object({}).partial().passthrough()]).optional(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_person = microsoft_graph_entity.and(
  z
    .object({
      birthday: z.string().nullish(),
      companyName: z.string().nullish(),
      department: z.string().nullish(),
      displayName: z.string().nullish(),
      givenName: z.string().nullish(),
      imAddress: z.string().nullish(),
      isFavorite: z.boolean().nullish(),
      jobTitle: z.string().nullish(),
      officeLocation: z.string().nullish(),
      personNotes: z.string().nullish(),
      personType: z
        .union([microsoft_graph_personType, z.object({}).partial().passthrough()])
        .optional(),
      phones: z.array(microsoft_graph_phone).optional(),
      postalAddresses: z.array(microsoft_graph_location).optional(),
      profession: z.string().nullish(),
      scoredEmailAddresses: z.array(microsoft_graph_scoredEmailAddress).optional(),
      surname: z.string().nullish(),
      userPrincipalName: z.string().nullish(),
      websites: z.array(microsoft_graph_website).optional(),
      yomiCompany: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_plannerUser = microsoft_graph_entity.and(
  z
    .object({
      plans: z.array(microsoft_graph_plannerPlan).optional(),
      tasks: z.array(microsoft_graph_plannerTask).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_presenceStatusMessage = z
  .object({
    expiryDateTime: z
      .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
      .optional(),
    message: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
    publishedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_presence = microsoft_graph_entity.and(
  z
    .object({
      activity: z.string().nullish(),
      availability: z.string().nullish(),
      statusMessage: z
        .union([microsoft_graph_presenceStatusMessage, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_scopedRoleMembership = microsoft_graph_entity.and(
  z
    .object({
      administrativeUnitId: z.string().optional(),
      roleId: z.string().optional(),
      roleMemberInfo: microsoft_graph_identity.optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_userInsightsSettings = microsoft_graph_entity.and(
  z.object({ isEnabled: z.boolean().optional(), '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_timeRange = z
  .object({
    endTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .nullish(),
    startTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_shiftAvailability = z
  .object({
    recurrence: z
      .union([microsoft_graph_patternedRecurrence, z.object({}).partial().passthrough()])
      .optional(),
    timeSlots: z.array(microsoft_graph_timeRange).optional(),
    timeZone: z.string().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_shiftPreferences = microsoft_graph_changeTrackedEntity.and(
  z
    .object({
      availability: z.array(microsoft_graph_shiftAvailability).optional(),
      '@odata.type': z.string().default('#microsoft.graph.shiftPreferences'),
    })
    .passthrough()
);
const microsoft_graph_storageQuotaBreakdown = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      manageWebUrl: z.string().nullish(),
      used: z.number().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_serviceStorageQuotaBreakdown = microsoft_graph_storageQuotaBreakdown.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_unifiedStorageQuota = microsoft_graph_entity.and(
  z
    .object({
      deleted: z.number().nullish(),
      manageWebUrl: z.string().nullish(),
      remaining: z.number().nullish(),
      state: z.string().nullish(),
      total: z.number().nullish(),
      used: z.number().nullish(),
      services: z.array(microsoft_graph_serviceStorageQuotaBreakdown).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_userStorage = microsoft_graph_entity.and(
  z
    .object({
      quota: z
        .union([microsoft_graph_unifiedStorageQuota, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
        .optional(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      payload: z.string().optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_windowsSetting = microsoft_graph_entity.and(
  z
    .object({
      payloadType: z.string().nullish(),
      settingType: microsoft_graph_windowsSettingType.optional(),
      windowsDeviceId: z.string().nullish(),
      instances: z.array(microsoft_graph_windowsSettingInstance).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_userSettings = microsoft_graph_entity.and(
  z
    .object({
      contributionToContentDiscoveryAsOrganizationDisabled: z.boolean().optional(),
      contributionToContentDiscoveryDisabled: z.boolean().optional(),
      itemInsights: z
        .union([microsoft_graph_userInsightsSettings, z.object({}).partial().passthrough()])
        .optional(),
      shiftPreferences: z
        .union([microsoft_graph_shiftPreferences, z.object({}).partial().passthrough()])
        .optional(),
      storage: z
        .union([microsoft_graph_userStorage, z.object({}).partial().passthrough()])
        .optional(),
      windows: z.array(microsoft_graph_windowsSetting).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_workingTimeSchedule = microsoft_graph_entity.and(
  z.object({ '@odata.type': z.string() }).passthrough()
);
const microsoft_graph_userSolutionRoot = microsoft_graph_entity.and(
  z
    .object({
      workingTimeSchedule: z
        .union([microsoft_graph_workingTimeSchedule, z.object({}).partial().passthrough()])
        .optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_associatedTeamInfo: z.ZodType<microsoft_graph_associatedTeamInfo> = z.lazy(
  () => microsoft_graph_teamInfo.and(z.object({ '@odata.type': z.string() }).passthrough())
);
const microsoft_graph_userScopeTeamsAppInstallation = microsoft_graph_teamsAppInstallation.and(
  z
    .object({
      chat: z.union([microsoft_graph_chat, z.object({}).partial().passthrough()]).optional(),
      '@odata.type': z.string().default('#microsoft.graph.userScopeTeamsAppInstallation'),
    })
    .passthrough()
);
const microsoft_graph_userTeamwork: z.ZodType<microsoft_graph_userTeamwork> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        locale: z.string().nullish(),
        region: z.string().nullish(),
        associatedTeams: z.array(microsoft_graph_associatedTeamInfo).optional(),
        installedApps: z.array(microsoft_graph_userScopeTeamsAppInstallation).optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
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
      contentType: z.string().nullish(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      name: z.string().nullish(),
      size: z.number().gte(-2147483648).lte(2147483647).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_attachmentSession = microsoft_graph_entity.and(
  z
    .object({
      content: z.string().nullish(),
      expirationDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .nullish(),
      nextExpectedRanges: z.array(z.string().nullable()).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
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
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      displayName: z.string().nullish(),
      isChecked: z.boolean().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_linkedResource = microsoft_graph_entity.and(
  z
    .object({
      applicationName: z.string().nullish(),
      displayName: z.string().nullish(),
      externalId: z.string().nullish(),
      webUrl: z.string().nullish(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_todoTask = microsoft_graph_entity.and(
  z
    .object({
      body: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]).optional(),
      bodyLastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      categories: z.array(z.string().nullable()).optional(),
      completedDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
        .optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      dueDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
        .optional(),
      hasAttachments: z.boolean().nullish(),
      importance: microsoft_graph_importance.optional(),
      isReminderOn: z.boolean().optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .optional(),
      recurrence: z
        .union([microsoft_graph_patternedRecurrence, z.object({}).partial().passthrough()])
        .optional(),
      reminderDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
        .optional(),
      startDateTime: z
        .union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()])
        .optional(),
      status: microsoft_graph_taskStatus.optional(),
      title: z.string().nullish(),
      attachments: z.array(microsoft_graph_attachmentBase).optional(),
      attachmentSessions: z.array(microsoft_graph_attachmentSession).optional(),
      checklistItems: z.array(microsoft_graph_checklistItem).optional(),
      extensions: z.array(microsoft_graph_extension).optional(),
      linkedResources: z.array(microsoft_graph_linkedResource).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_todoTaskList = microsoft_graph_entity.and(
  z
    .object({
      displayName: z.string().nullish(),
      isOwner: z.boolean().optional(),
      isShared: z.boolean().optional(),
      wellknownListName: microsoft_graph_wellknownListName.optional(),
      extensions: z.array(microsoft_graph_extension).optional(),
      tasks: z.array(microsoft_graph_todoTask).optional(),
      '@odata.type': z.string(),
    })
    .passthrough()
);
const microsoft_graph_todo = microsoft_graph_entity.and(
  z
    .object({ lists: z.array(microsoft_graph_todoTaskList).optional(), '@odata.type': z.string() })
    .passthrough()
);
const microsoft_graph_user: z.ZodType<microsoft_graph_user> = z.lazy(() =>
  microsoft_graph_directoryObject.and(
    z
      .object({
        aboutMe: z.string().nullish(),
        accountEnabled: z.boolean().nullish(),
        ageGroup: z.string().nullish(),
        assignedLicenses: z.array(microsoft_graph_assignedLicense).optional(),
        assignedPlans: z.array(microsoft_graph_assignedPlan).optional(),
        authorizationInfo: z
          .union([microsoft_graph_authorizationInfo, z.object({}).partial().passthrough()])
          .optional(),
        birthday: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        businessPhones: z.array(z.string()).optional(),
        city: z.string().nullish(),
        companyName: z.string().nullish(),
        consentProvidedForMinor: z.string().nullish(),
        country: z.string().nullish(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        creationType: z.string().nullish(),
        customSecurityAttributes: z
          .union([
            microsoft_graph_customSecurityAttributeValue,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        department: z.string().nullish(),
        deviceEnrollmentLimit: z.number().gte(-2147483648).lte(2147483647).optional(),
        displayName: z.string().nullish(),
        employeeHireDate: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        employeeId: z.string().nullish(),
        employeeLeaveDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        employeeOrgData: z
          .union([microsoft_graph_employeeOrgData, z.object({}).partial().passthrough()])
          .optional(),
        employeeType: z.string().nullish(),
        externalUserState: z.string().nullish(),
        externalUserStateChangeDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        faxNumber: z.string().nullish(),
        givenName: z.string().nullish(),
        hireDate: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        identities: z.array(microsoft_graph_objectIdentity).optional(),
        imAddresses: z.array(z.string().nullable()).optional(),
        interests: z.array(z.string().nullable()).optional(),
        isManagementRestricted: z.boolean().nullish(),
        isResourceAccount: z.boolean().nullish(),
        jobTitle: z.string().nullish(),
        lastPasswordChangeDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        legalAgeGroupClassification: z.string().nullish(),
        licenseAssignmentStates: z.array(microsoft_graph_licenseAssignmentState).optional(),
        mail: z.string().nullish(),
        mailboxSettings: z
          .union([microsoft_graph_mailboxSettings, z.object({}).partial().passthrough()])
          .optional(),
        mailNickname: z.string().nullish(),
        mobilePhone: z.string().nullish(),
        mySite: z.string().nullish(),
        officeLocation: z.string().nullish(),
        onPremisesDistinguishedName: z.string().nullish(),
        onPremisesDomainName: z.string().nullish(),
        onPremisesExtensionAttributes: z
          .union([
            microsoft_graph_onPremisesExtensionAttributes,
            z.object({}).partial().passthrough(),
          ])
          .optional(),
        onPremisesImmutableId: z.string().nullish(),
        onPremisesLastSyncDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        onPremisesProvisioningErrors: z
          .array(microsoft_graph_onPremisesProvisioningError)
          .optional(),
        onPremisesSamAccountName: z.string().nullish(),
        onPremisesSecurityIdentifier: z.string().nullish(),
        onPremisesSyncEnabled: z.boolean().nullish(),
        onPremisesUserPrincipalName: z.string().nullish(),
        otherMails: z.array(z.string()).optional(),
        passwordPolicies: z.string().nullish(),
        passwordProfile: z
          .union([microsoft_graph_passwordProfile, z.object({}).partial().passthrough()])
          .optional(),
        pastProjects: z.array(z.string().nullable()).optional(),
        postalCode: z.string().nullish(),
        preferredDataLocation: z.string().nullish(),
        preferredLanguage: z.string().nullish(),
        preferredName: z.string().nullish(),
        print: z
          .union([microsoft_graph_userPrint, z.object({}).partial().passthrough()])
          .optional(),
        provisionedPlans: z.array(microsoft_graph_provisionedPlan).optional(),
        proxyAddresses: z.array(z.string()).optional(),
        responsibilities: z.array(z.string().nullable()).optional(),
        schools: z.array(z.string().nullable()).optional(),
        securityIdentifier: z.string().nullish(),
        serviceProvisioningErrors: z.array(microsoft_graph_serviceProvisioningError).optional(),
        showInAddressList: z.boolean().nullish(),
        signInActivity: z
          .union([microsoft_graph_signInActivity, z.object({}).partial().passthrough()])
          .optional(),
        signInSessionsValidFromDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .nullish(),
        skills: z.array(z.string().nullable()).optional(),
        state: z.string().nullish(),
        streetAddress: z.string().nullish(),
        surname: z.string().nullish(),
        usageLocation: z.string().nullish(),
        userPrincipalName: z.string().nullish(),
        userType: z.string().nullish(),
        activities: z.array(microsoft_graph_userActivity).optional(),
        agreementAcceptances: z.array(microsoft_graph_agreementAcceptance).optional(),
        appRoleAssignments: z.array(microsoft_graph_appRoleAssignment).optional(),
        authentication: z
          .union([microsoft_graph_authentication, z.object({}).partial().passthrough()])
          .optional(),
        calendar: z
          .union([microsoft_graph_calendar, z.object({}).partial().passthrough()])
          .optional(),
        calendarGroups: z.array(microsoft_graph_calendarGroup).optional(),
        calendars: z.array(microsoft_graph_calendar).optional(),
        calendarView: z.array(microsoft_graph_event).optional(),
        chats: z.array(microsoft_graph_chat).optional(),
        cloudClipboard: z
          .union([microsoft_graph_cloudClipboardRoot, z.object({}).partial().passthrough()])
          .optional(),
        contactFolders: z.array(microsoft_graph_contactFolder).optional(),
        contacts: z.array(microsoft_graph_contact).optional(),
        createdObjects: z.array(microsoft_graph_directoryObject).optional(),
        deviceManagementTroubleshootingEvents: z
          .array(microsoft_graph_deviceManagementTroubleshootingEvent)
          .optional(),
        directReports: z.array(microsoft_graph_directoryObject).optional(),
        drive: z.union([microsoft_graph_drive, z.object({}).partial().passthrough()]).optional(),
        drives: z.array(microsoft_graph_drive).optional(),
        employeeExperience: z
          .union([microsoft_graph_employeeExperienceUser, z.object({}).partial().passthrough()])
          .optional(),
        events: z.array(microsoft_graph_event).optional(),
        extensions: z.array(microsoft_graph_extension).optional(),
        followedSites: z.array(microsoft_graph_site).optional(),
        inferenceClassification: z
          .union([microsoft_graph_inferenceClassification, z.object({}).partial().passthrough()])
          .optional(),
        insights: z
          .union([microsoft_graph_itemInsights, z.object({}).partial().passthrough()])
          .optional(),
        joinedTeams: z.array(microsoft_graph_team).optional(),
        licenseDetails: z.array(microsoft_graph_licenseDetails).optional(),
        mailFolders: z.array(microsoft_graph_mailFolder).optional(),
        managedAppRegistrations: z.array(microsoft_graph_managedAppRegistration).optional(),
        managedDevices: z.array(microsoft_graph_managedDevice).optional(),
        manager: z
          .union([microsoft_graph_directoryObject, z.object({}).partial().passthrough()])
          .optional(),
        memberOf: z.array(microsoft_graph_directoryObject).optional(),
        messages: z.array(microsoft_graph_message).optional(),
        oauth2PermissionGrants: z.array(microsoft_graph_oAuth2PermissionGrant).optional(),
        onenote: z
          .union([microsoft_graph_onenote, z.object({}).partial().passthrough()])
          .optional(),
        onlineMeetings: z.array(microsoft_graph_onlineMeeting).optional(),
        outlook: z
          .union([microsoft_graph_outlookUser, z.object({}).partial().passthrough()])
          .optional(),
        ownedDevices: z.array(microsoft_graph_directoryObject).optional(),
        ownedObjects: z.array(microsoft_graph_directoryObject).optional(),
        people: z.array(microsoft_graph_person).optional(),
        permissionGrants: z.array(microsoft_graph_resourceSpecificPermissionGrant).optional(),
        photo: z
          .union([microsoft_graph_profilePhoto, z.object({}).partial().passthrough()])
          .optional(),
        photos: z.array(microsoft_graph_profilePhoto).optional(),
        planner: z
          .union([microsoft_graph_plannerUser, z.object({}).partial().passthrough()])
          .optional(),
        presence: z
          .union([microsoft_graph_presence, z.object({}).partial().passthrough()])
          .optional(),
        registeredDevices: z.array(microsoft_graph_directoryObject).optional(),
        scopedRoleMemberOf: z.array(microsoft_graph_scopedRoleMembership).optional(),
        settings: z
          .union([microsoft_graph_userSettings, z.object({}).partial().passthrough()])
          .optional(),
        solutions: z
          .union([microsoft_graph_userSolutionRoot, z.object({}).partial().passthrough()])
          .optional(),
        sponsors: z.array(microsoft_graph_directoryObject).optional(),
        teamwork: z
          .union([microsoft_graph_userTeamwork, z.object({}).partial().passthrough()])
          .optional(),
        todo: z.union([microsoft_graph_todo, z.object({}).partial().passthrough()]).optional(),
        transitiveMemberOf: z.array(microsoft_graph_directoryObject).optional(),
        '@odata.type': z.string().default('#microsoft.graph.user'),
      })
      .passthrough()
  )
);
const microsoft_graph_baseItem: z.ZodType<microsoft_graph_baseItem> = z.lazy(() =>
  microsoft_graph_entity.and(
    z
      .object({
        createdBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
          .optional(),
        createdDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        description: z.string().nullish(),
        eTag: z.string().nullish(),
        lastModifiedBy: z
          .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
          .optional(),
        lastModifiedDateTime: z
          .string()
          .regex(
            /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
          )
          .datetime({ offset: true })
          .optional(),
        name: z.string().nullish(),
        parentReference: z
          .union([microsoft_graph_itemReference, z.object({}).partial().passthrough()])
          .optional(),
        webUrl: z.string().nullish(),
        createdByUser: z
          .union([microsoft_graph_user, z.object({}).partial().passthrough()])
          .optional(),
        lastModifiedByUser: z
          .union([microsoft_graph_user, z.object({}).partial().passthrough()])
          .optional(),
        '@odata.type': z.string(),
      })
      .passthrough()
  )
);
const microsoft_graph_storagePlanInformation = z
  .object({ upgradeAvailable: z.boolean().nullish(), '@odata.type': z.string() })
  .passthrough();
const microsoft_graph_quota = z
  .object({
    deleted: z.number().nullish(),
    remaining: z.number().nullish(),
    state: z.string().nullish(),
    storagePlanInformation: z
      .union([microsoft_graph_storagePlanInformation, z.object({}).partial().passthrough()])
      .optional(),
    total: z.number().nullish(),
    used: z.number().nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_drive: z.ZodType<microsoft_graph_drive> = z.lazy(() =>
  microsoft_graph_baseItem.and(
    z
      .object({
        driveType: z.string().nullish(),
        owner: z
          .union([microsoft_graph_identitySet, z.object({}).partial().passthrough()])
          .optional(),
        quota: z.union([microsoft_graph_quota, z.object({}).partial().passthrough()]).optional(),
        sharePointIds: z
          .union([microsoft_graph_sharepointIds, z.object({}).partial().passthrough()])
          .optional(),
        system: z
          .union([microsoft_graph_systemFacet, z.object({}).partial().passthrough()])
          .optional(),
        bundles: z.array(microsoft_graph_driveItem).optional(),
        following: z.array(microsoft_graph_driveItem).optional(),
        items: z.array(microsoft_graph_driveItem).optional(),
        list: z.union([microsoft_graph_list, z.object({}).partial().passthrough()]).optional(),
        root: z.union([microsoft_graph_driveItem, z.object({}).partial().passthrough()]).optional(),
        special: z.array(microsoft_graph_driveItem).optional(),
        '@odata.type': z.string().default('#microsoft.graph.drive'),
      })
      .passthrough()
  )
);
const microsoft_graph_driveCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_drive) })
    .partial()
    .passthrough()
);
const microsoft_graph_ODataErrors_ErrorDetails = z
  .object({ code: z.string(), message: z.string(), target: z.string().nullish() })
  .passthrough();
const microsoft_graph_ODataErrors_InnerError = z
  .object({
    'request-id': z.string().nullish(),
    'client-request-id': z.string().nullish(),
    date: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    '@odata.type': z.string(),
  })
  .passthrough();
const microsoft_graph_ODataErrors_MainError = z
  .object({
    code: z.string(),
    message: z.string(),
    target: z.string().nullish(),
    details: z.array(microsoft_graph_ODataErrors_ErrorDetails).optional(),
    innerError: microsoft_graph_ODataErrors_InnerError.optional(),
  })
  .passthrough();
const microsoft_graph_ODataErrors_ODataError = z
  .object({ error: microsoft_graph_ODataErrors_MainError })
  .passthrough();
const microsoft_graph_calendarCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_calendar) })
    .partial()
    .passthrough()
);
const microsoft_graph_eventCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_event) })
    .partial()
    .passthrough()
);
const microsoft_graph_contactCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_contact) })
    .partial()
    .passthrough()
);
const microsoft_graph_mailFolderCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_mailFolder) })
    .partial()
    .passthrough()
);
const microsoft_graph_messageCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_message) })
    .partial()
    .passthrough()
);
const microsoft_graph_notebookCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_notebook) })
    .partial()
    .passthrough()
);
const microsoft_graph_plannerTaskCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_plannerTask) })
    .partial()
    .passthrough()
);
const microsoft_graph_todoTaskListCollectionResponse = BaseCollectionPaginationCountResponse.and(
  z
    .object({ value: z.array(microsoft_graph_todoTaskList) })
    .partial()
    .passthrough()
);

export const schemas = {
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
  microsoft_graph_publicErrorDetail,
  microsoft_graph_publicInnerError,
  microsoft_graph_publicError,
  microsoft_graph_root,
  microsoft_graph_siteArchiveStatus,
  microsoft_graph_siteArchivalDetails,
  microsoft_graph_siteCollection,
  microsoft_graph_itemActionStat,
  microsoft_graph_incompleteData,
  microsoft_graph_accessAction,
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
  microsoft_graph_geoCoordinates,
  microsoft_graph_malware,
  microsoft_graph_package,
  microsoft_graph_pendingContentUpdate,
  microsoft_graph_pendingOperations,
  microsoft_graph_photo,
  microsoft_graph_publicationFacet,
  microsoft_graph_shared,
  microsoft_graph_specialFolder,
  microsoft_graph_video,
  microsoft_graph_remoteItem,
  microsoft_graph_searchResult,
  microsoft_graph_contentTypeInfo,
  microsoft_graph_baseItemVersion,
  microsoft_graph_fieldValueSet,
  microsoft_graph_listItemVersion,
  microsoft_graph_documentSetVersionItem,
  microsoft_graph_documentSetVersion,
  microsoft_graph_listItem,
  microsoft_graph_sharePointIdentity,
  microsoft_graph_sharePointIdentitySet,
  microsoft_graph_sharingInvitation,
  microsoft_graph_sharingLink,
  microsoft_graph_permission,
  microsoft_graph_security_behaviorDuringRetentionPeriod,
  microsoft_graph_retentionLabelSettings,
  microsoft_graph_itemRetentionLabel,
  microsoft_graph_subscription,
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
  microsoft_graph_itemActivity,
  microsoft_graph_itemActivityStat,
  microsoft_graph_itemAnalytics,
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
  microsoft_graph_listInfo,
  microsoft_graph_systemFacet,
  microsoft_graph_longRunningOperationStatus,
  microsoft_graph_longRunningOperation,
  microsoft_graph_richLongRunningOperation,
  microsoft_graph_list,
  microsoft_graph_pageLayoutType,
  microsoft_graph_baseSitePage,
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
  microsoft_graph_storagePlanInformation,
  microsoft_graph_quota,
  microsoft_graph_drive,
  microsoft_graph_driveCollectionResponse,
  microsoft_graph_ODataErrors_ErrorDetails,
  microsoft_graph_ODataErrors_InnerError,
  microsoft_graph_ODataErrors_MainError,
  microsoft_graph_ODataErrors_ODataError,
  microsoft_graph_calendarCollectionResponse,
  microsoft_graph_eventCollectionResponse,
  microsoft_graph_contactCollectionResponse,
  microsoft_graph_mailFolderCollectionResponse,
  microsoft_graph_messageCollectionResponse,
  microsoft_graph_notebookCollectionResponse,
  microsoft_graph_plannerTaskCollectionResponse,
  microsoft_graph_todoTaskListCollectionResponse,
};

const endpoints = makeApi([
  {
    method: 'get',
    path: '/drives',
    alias: 'drives.drive.ListDrive',
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    path: '/me',
    alias: 'me.user.GetUser',
    description: `Returns the user or organizational contact assigned as the user&#x27;s manager. Optionally, you can expand the manager&#x27;s chain up to the root node.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'ConsistencyLevel',
        type: 'Header',
        schema: z.string().optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    alias: 'me.ListCalendars',
    description: `Get all the user&#x27;s calendars (/calendars navigation property), get the calendars from the default calendar group or from a specific calendar group.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    alias: 'me.ListCalendarView',
    description: `Get the occurrences, exceptions, and single instances of events in a calendar view defined by a time range, from the user&#x27;s default calendar,
or from some other calendar of the user.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'startDateTime',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: 'endDateTime',
        type: 'Query',
        schema: z.string(),
      },
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    alias: 'me.ListContacts',
    description: `Get a contact collection from the default contacts folder of the signed-in user. There are two scenarios where an app can get contacts in another user&#x27;s contact folder:`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    method: 'get',
    path: '/me/events',
    alias: 'me.ListEvents',
    description: `Get a list of event objects in the user&#x27;s mailbox. The list contains single
instance meetings and series masters. To get expanded event instances, you can get the calendar view, or
get the instances of an event. Currently, this operation returns event bodies in only HTML format. There are two scenarios where an app can get events in another user&#x27;s calendar:`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    path: '/me/mailFolders',
    alias: 'me.ListMailFolders',
    description: `Get the mail folder collection directly under the root folder of the signed-in user. The returned collection includes any mail search folders directly under the root. By default, this operation does not return hidden folders. Use a query parameter includeHiddenFolders to include them in the response. This operation does not return all mail folders in a mailbox, only the child folders of the root folder. To return all mail folders in a mailbox, each child folder must be traversed separately.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'includeHiddenFolders',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    path: '/me/messages',
    alias: 'me.ListMessages',
    description: `Get the messages in the signed-in user&#x27;s mailbox (including the Deleted Items and Clutter folders). Depending on the page size and mailbox data, getting messages from a mailbox can incur multiple requests. The default page size is 10 messages. Use $top to customize the page size, within the range of 1 and 1000. To improve the operation response time, use $select to specify the exact properties you need; see example 1 below. Fine-tune the values for $select and $top, especially when you must use a larger page size, as returning a page with hundreds of messages each with a full response payload may trigger the gateway timeout (HTTP 504). To get the next page of messages, simply apply the entire URL returned in @odata.nextLink to the next get-messages request. This URL includes any query parameters you may have specified in the initial request. Do not try to extract the $skip value from the @odata.nextLink URL to manipulate responses. This API uses the $skip value to keep count of all the items it has gone through in the user&#x27;s mailbox to return a page of message-type items. It&#x27;s therefore possible that even in the initial response, the $skip value is larger than the page size. For more information, see Paging Microsoft Graph data in your app. Currently, this operation returns message bodies in only HTML format. There are two scenarios where an app can get messages in another user&#x27;s mail folder:`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'includeHiddenMessages',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    path: '/me/onenote/notebooks',
    alias: 'me.onenote.ListNotebooks',
    description: `Retrieve a list of notebook objects.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    method: 'post',
    path: '/me/onenote/pages',
    alias: 'me.onenote.CreatePages',
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
    path: '/me/planner/tasks',
    alias: 'me.planner.ListTasks',
    description: `Retrieve a list of plannertask objects assigned to a User.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    method: 'get',
    path: '/me/todo/lists',
    alias: 'me.todo.ListLists',
    description: `Get a list of the todoTaskList objects and their properties.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$skip',
        type: 'Query',
        schema: z.number().int().gte(0).optional(),
      },
      {
        name: '$search',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$filter',
        type: 'Query',
        schema: z.string().optional(),
      },
      {
        name: '$count',
        type: 'Query',
        schema: z.boolean().optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).optional(),
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
    method: 'post',
    path: '/planner/tasks',
    alias: 'planner.CreateTasks',
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
]);

export const MicrosoftGraphSchemas = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
