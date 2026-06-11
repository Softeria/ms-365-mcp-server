import { makeApi, Zodios } from './hack.js';
import { z } from 'zod';

type microsoft_graph_channel = {
  id?: string | undefined;
  createdDateTime?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: string | undefined;
  email?: (string | null) | undefined;
  isArchived?: (boolean | null) | undefined;
  isFavoriteByDefault?: (boolean | null) | undefined;
  layoutType?: microsoft_graph_channelLayoutType | undefined;
  membershipType?: microsoft_graph_channelMembershipType | undefined;
  migrationMode?: microsoft_graph_migrationMode | undefined;
  originalCreatedDateTime?: (string | null) | undefined;
  summary?: microsoft_graph_channelSummary | undefined;
  tenantId?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  allMembers?: Array<microsoft_graph_conversationMember> | undefined;
  enabledApps?: Array<microsoft_graph_teamsApp> | undefined;
  filesFolder?: microsoft_graph_driveItem | undefined;
  members?: Array<microsoft_graph_conversationMember> | undefined;
  messages?: Array<microsoft_graph_chatMessage> | undefined;
  sharedWithTeams?: Array<microsoft_graph_sharedWithChannelTeamInfo> | undefined;
  tabs?: Array<microsoft_graph_teamsTab> | undefined;
};
type microsoft_graph_channelLayoutType = 'post' | 'chat' | 'unknownFutureValue';
type microsoft_graph_channelMembershipType =
  | 'standard'
  | 'private'
  | 'unknownFutureValue'
  | 'shared';
type microsoft_graph_migrationMode = 'inProgress' | 'completed' | 'unknownFutureValue';
type microsoft_graph_channelSummary = {
  guestsCount?: (number | null) | undefined;
  hasMembersFromOtherTenants?: (boolean | null) | undefined;
  membersCount?: (number | null) | undefined;
  ownersCount?: (number | null) | undefined;
};
type microsoft_graph_conversationMember = {
  id?: string | undefined;
  displayName?: (string | null) | undefined;
  roles?: Array<string | null> | undefined;
  visibleHistoryStartDateTime?: (string | null) | undefined;
};
type microsoft_graph_teamsApp = {
  id?: string | undefined;
  displayName?: (string | null) | undefined;
  distributionMethod?: microsoft_graph_teamsAppDistributionMethod | undefined;
  externalId?: (string | null) | undefined;
  appDefinitions?: Array<microsoft_graph_teamsAppDefinition> | undefined;
};
type microsoft_graph_teamsAppDistributionMethod =
  | 'store'
  | 'organization'
  | 'sideloaded'
  | 'unknownFutureValue';
type microsoft_graph_teamsAppDefinition = {
  id?: string | undefined;
  authorization?: microsoft_graph_teamsAppAuthorization | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  publishingState?: microsoft_graph_teamsAppPublishingState | undefined;
  shortDescription?: (string | null) | undefined;
  teamsAppId?: (string | null) | undefined;
  version?: (string | null) | undefined;
  bot?: microsoft_graph_teamworkBot | undefined;
};
type microsoft_graph_teamsAppAuthorization = {
  clientAppId?: (string | null) | undefined;
  requiredPermissionSet?: microsoft_graph_teamsAppPermissionSet | undefined;
};
type microsoft_graph_teamsAppPermissionSet = {
  resourceSpecificPermissions?:
    | Array<microsoft_graph_teamsAppResourceSpecificPermission>
    | undefined;
};
type microsoft_graph_teamsAppResourceSpecificPermission = {
  permissionType?: microsoft_graph_teamsAppResourceSpecificPermissionType | undefined;
  permissionValue?: (string | null) | undefined;
};
type microsoft_graph_teamsAppResourceSpecificPermissionType =
  | 'delegated'
  | 'application'
  | 'unknownFutureValue';
type microsoft_graph_identitySet = {
  application?: microsoft_graph_identity | undefined;
  device?: microsoft_graph_identity | undefined;
  user?: microsoft_graph_identity | undefined;
};
type microsoft_graph_identity = {
  displayName?: (string | null) | undefined;
  id?: (string | null) | undefined;
};
type microsoft_graph_teamsAppPublishingState =
  | 'submitted'
  | 'rejected'
  | 'published'
  | 'unknownFutureValue';
type microsoft_graph_teamworkBot = {
  id?: string | undefined;
};
type microsoft_graph_driveItem = {
  id?: string | undefined;
  name?: (string | null) | undefined;
  description?: (string | null) | undefined;
  createdDateTime?: string | undefined;
  lastModifiedDateTime?: string | undefined;
  content?: (string | null) | undefined;
  location?: microsoft_graph_geoCoordinates | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  eTag?: (string | null) | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  parentReference?: microsoft_graph_itemReference | undefined;
  webUrl?: (string | null) | undefined;
  createdByUser?: microsoft_graph_user | undefined;
  lastModifiedByUser?: microsoft_graph_user | undefined;
  audio?: microsoft_graph_audio | undefined;
  bundle?: microsoft_graph_bundle | undefined;
  cTag?: (string | null) | undefined;
  deleted?: microsoft_graph_deleted | undefined;
  file?: microsoft_graph_file | undefined;
  fileSystemInfo?: microsoft_graph_fileSystemInfo | undefined;
  folder?: microsoft_graph_folder | undefined;
  image?: microsoft_graph_image | undefined;
  malware?: microsoft_graph_malware | undefined;
  package?: microsoft_graph_package | undefined;
  pendingOperations?: microsoft_graph_pendingOperations | undefined;
} & {
  [key: string]: any;
};
type microsoft_graph_geoCoordinates = {
  altitude?: (number | null) | undefined;
  latitude?: (number | null) | undefined;
  longitude?: (number | null) | undefined;
};
type microsoft_graph_itemReference = {
  driveId?: (string | null) | undefined;
  driveType?: (string | null) | undefined;
  id?: (string | null) | undefined;
  name?: (string | null) | undefined;
  path?: (string | null) | undefined;
  shareId?: (string | null) | undefined;
  sharepointIds?: microsoft_graph_sharepointIds | undefined;
  siteId?: (string | null) | undefined;
};
type microsoft_graph_sharepointIds = {
  listId?: (string | null) | undefined;
  listItemId?: (string | null) | undefined;
  listItemUniqueId?: (string | null) | undefined;
  siteId?: (string | null) | undefined;
  siteUrl?: (string | null) | undefined;
  tenantId?: (string | null) | undefined;
  webId?: (string | null) | undefined;
};
type microsoft_graph_user = {
  id?: string | undefined;
  displayName?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  state?: (string | null) | undefined;
  userPrincipalName?: (string | null) | undefined;
  deletedDateTime?: (string | null) | undefined;
  aboutMe?: (string | null) | undefined;
  accountEnabled?: (boolean | null) | undefined;
  ageGroup?: (string | null) | undefined;
  assignedLicenses?: Array<microsoft_graph_assignedLicense> | undefined;
  assignedPlans?: Array<microsoft_graph_assignedPlan> | undefined;
  authorizationInfo?: microsoft_graph_authorizationInfo | undefined;
  birthday?: string | undefined;
  businessPhones?: Array<string> | undefined;
  city?: (string | null) | undefined;
  companyName?: (string | null) | undefined;
  consentProvidedForMinor?: (string | null) | undefined;
  country?: (string | null) | undefined;
  creationType?: (string | null) | undefined;
  customSecurityAttributes?: microsoft_graph_customSecurityAttributeValue | undefined;
  department?: (string | null) | undefined;
  deviceEnrollmentLimit?: number | undefined;
  employeeHireDate?: (string | null) | undefined;
  employeeId?: (string | null) | undefined;
  employeeLeaveDateTime?: (string | null) | undefined;
} & {
  [key: string]: any;
};
type microsoft_graph_assignedLicense = {
  disabledPlans?: Array<string> | undefined;
  skuId?: (string | null) | undefined;
};
type microsoft_graph_assignedPlan = {
  assignedDateTime?: (string | null) | undefined;
  capabilityStatus?: (string | null) | undefined;
  service?: (string | null) | undefined;
  servicePlanId?: (string | null) | undefined;
};
type microsoft_graph_authorizationInfo = {
  certificateUserIds?: Array<string | null> | undefined;
};
type microsoft_graph_customSecurityAttributeValue = {};
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
};
type microsoft_graph_bundle = {
  album?: microsoft_graph_album | undefined;
  childCount?: (number | null) | undefined;
};
type microsoft_graph_album = {
  coverImageItemId?: (string | null) | undefined;
};
type microsoft_graph_deleted = {
  state?: (string | null) | undefined;
};
type microsoft_graph_file = {
  hashes?: microsoft_graph_hashes | undefined;
  mimeType?: (string | null) | undefined;
  processingMetadata?: (boolean | null) | undefined;
};
type microsoft_graph_hashes = {
  crc32Hash?: (string | null) | undefined;
  quickXorHash?: (string | null) | undefined;
  sha1Hash?: (string | null) | undefined;
  sha256Hash?: (string | null) | undefined;
};
type microsoft_graph_fileSystemInfo = {
  createdDateTime?: (string | null) | undefined;
  lastAccessedDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
};
type microsoft_graph_folder = {
  childCount?: (number | null) | undefined;
  view?: microsoft_graph_folderView | undefined;
};
type microsoft_graph_folderView = {
  sortBy?: (string | null) | undefined;
  sortOrder?: (string | null) | undefined;
  viewType?: (string | null) | undefined;
};
type microsoft_graph_image = {
  height?: (number | null) | undefined;
  width?: (number | null) | undefined;
};
type microsoft_graph_malware = {
  description?: (string | null) | undefined;
};
type microsoft_graph_package = {
  type?: (string | null) | undefined;
};
type microsoft_graph_pendingOperations = {
  pendingContentUpdate?: microsoft_graph_pendingContentUpdate | undefined;
};
type microsoft_graph_pendingContentUpdate = {
  queuedDateTime?: (string | null) | undefined;
};
type microsoft_graph_chatMessageAttachment = {
  content?: (string | null) | undefined;
  contentType?: (string | null) | undefined;
  contentUrl?: (string | null) | undefined;
  id?: (string | null) | undefined;
  name?: (string | null) | undefined;
  teamsAppId?: (string | null) | undefined;
  thumbnailUrl?: (string | null) | undefined;
};
type microsoft_graph_itemBody = {
  content?: (string | null) | undefined;
  contentType?: microsoft_graph_bodyType | undefined;
};
type microsoft_graph_bodyType = 'text' | 'html';
type microsoft_graph_channelIdentity = {
  channelId?: (string | null) | undefined;
  teamId?: (string | null) | undefined;
};
type microsoft_graph_eventMessageDetail = {};
type microsoft_graph_chatMessageFromIdentitySet = {
  application?: microsoft_graph_identity | undefined;
  device?: microsoft_graph_identity | undefined;
  user?: microsoft_graph_identity | undefined;
};
type microsoft_graph_chatMessageImportance = 'normal' | 'high' | 'urgent' | 'unknownFutureValue';
type microsoft_graph_chatMessageMention = {
  id?: (number | null) | undefined;
  mentioned?: microsoft_graph_chatMessageMentionedIdentitySet | undefined;
  mentionText?: (string | null) | undefined;
};
type microsoft_graph_chatMessageMentionedIdentitySet = {
  application?: microsoft_graph_identity | undefined;
  device?: microsoft_graph_identity | undefined;
  user?: microsoft_graph_identity | undefined;
  conversation?: microsoft_graph_teamworkConversationIdentity | undefined;
};
type microsoft_graph_teamworkConversationIdentity = {
  displayName?: (string | null) | undefined;
  id?: (string | null) | undefined;
  conversationIdentityType?: microsoft_graph_teamworkConversationIdentityType | undefined;
};
type microsoft_graph_teamworkConversationIdentityType =
  | 'team'
  | 'channel'
  | 'chat'
  | 'unknownFutureValue';
type microsoft_graph_chatMessageHistoryItem = {
  actions?: microsoft_graph_chatMessageActions | undefined;
  modifiedDateTime?: string | undefined;
  reaction?: microsoft_graph_chatMessageReaction | undefined;
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
};
type microsoft_graph_chatMessageReactionIdentitySet = {
  application?: microsoft_graph_identity | undefined;
  device?: microsoft_graph_identity | undefined;
  user?: microsoft_graph_identity | undefined;
};
type microsoft_graph_chatMessageType =
  | 'message'
  | 'chatEvent'
  | 'typing'
  | 'unknownFutureValue'
  | 'systemEventMessage';
type microsoft_graph_chatMessagePolicyViolation = {
  dlpAction?: microsoft_graph_chatMessagePolicyViolationDlpActionTypes | undefined;
  justificationText?: (string | null) | undefined;
  policyTip?: microsoft_graph_chatMessagePolicyViolationPolicyTip | undefined;
  userAction?: microsoft_graph_chatMessagePolicyViolationUserActionTypes | undefined;
  verdictDetails?: microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes | undefined;
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
type microsoft_graph_chatMessageHostedContent = {
  id?: string | undefined;
  contentBytes?: (string | null) | undefined;
  contentType?: (string | null) | undefined;
};
type microsoft_graph_teamFunSettings = {
  allowCustomMemes?: (boolean | null) | undefined;
  allowGiphy?: (boolean | null) | undefined;
  allowStickersAndMemes?: (boolean | null) | undefined;
  giphyContentRating?: microsoft_graph_giphyRatingType | undefined;
};
type microsoft_graph_giphyRatingType = 'strict' | 'moderate' | 'unknownFutureValue';
type microsoft_graph_teamGuestSettings = {
  allowCreateUpdateChannels?: (boolean | null) | undefined;
  allowDeleteChannels?: (boolean | null) | undefined;
};
type microsoft_graph_teamMemberSettings = {
  allowAddRemoveApps?: (boolean | null) | undefined;
  allowCreatePrivateChannels?: (boolean | null) | undefined;
  allowCreateUpdateChannels?: (boolean | null) | undefined;
  allowCreateUpdateRemoveConnectors?: (boolean | null) | undefined;
  allowCreateUpdateRemoveTabs?: (boolean | null) | undefined;
  allowDeleteChannels?: (boolean | null) | undefined;
};
type microsoft_graph_teamMessagingSettings = {
  allowChannelMentions?: (boolean | null) | undefined;
  allowOwnerDeleteMessages?: (boolean | null) | undefined;
  allowTeamMentions?: (boolean | null) | undefined;
  allowUserDeleteMessages?: (boolean | null) | undefined;
  allowUserEditMessages?: (boolean | null) | undefined;
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
};
type microsoft_graph_teamVisibilityType =
  | 'private'
  | 'public'
  | 'hiddenMembership'
  | 'unknownFutureValue';
type microsoft_graph_group = {
  id?: string | undefined;
  displayName?: (string | null) | undefined;
  description?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  deletedDateTime?: (string | null) | undefined;
  allowExternalSenders?: (boolean | null) | undefined;
  assignedLabels?: Array<microsoft_graph_assignedLabel> | undefined;
  assignedLicenses?: Array<microsoft_graph_assignedLicense> | undefined;
  autoSubscribeNewMembers?: (boolean | null) | undefined;
  classification?: (string | null) | undefined;
  expirationDateTime?: (string | null) | undefined;
  groupTypes?: Array<string> | undefined;
  hasMembersWithLicenseErrors?: (boolean | null) | undefined;
  hideFromAddressLists?: (boolean | null) | undefined;
  hideFromOutlookClients?: (boolean | null) | undefined;
  infoCatalogs?: Array<string> | undefined;
  isArchived?: (boolean | null) | undefined;
  isAssignableToRole?: (boolean | null) | undefined;
  isManagementRestricted?: (boolean | null) | undefined;
  isSubscribedByMail?: (boolean | null) | undefined;
  licenseProcessingState?: microsoft_graph_licenseProcessingState | undefined;
  mail?: (string | null) | undefined;
  mailEnabled?: (boolean | null) | undefined;
  mailNickname?: (string | null) | undefined;
  membershipRule?: (string | null) | undefined;
} & {
  [key: string]: any;
};
type microsoft_graph_assignedLabel = {
  displayName?: (string | null) | undefined;
  labelId?: (string | null) | undefined;
};
type microsoft_graph_licenseProcessingState = {
  state?: (string | null) | undefined;
};
type microsoft_graph_teamsAppInstallation = {
  id?: string | undefined;
  consentedPermissionSet?: microsoft_graph_teamsAppPermissionSet | undefined;
  teamsApp?: microsoft_graph_teamsApp | undefined;
  teamsAppDefinition?: microsoft_graph_teamsAppDefinition | undefined;
};
type microsoft_graph_teamsAsyncOperation = {
  id?: string | undefined;
  attemptsCount?: number | undefined;
  createdDateTime?: string | undefined;
  error?: microsoft_graph_operationError | undefined;
  lastActionDateTime?: string | undefined;
  operationType?: microsoft_graph_teamsAsyncOperationType | undefined;
  status?: microsoft_graph_teamsAsyncOperationStatus | undefined;
  targetResourceId?: (string | null) | undefined;
  targetResourceLocation?: (string | null) | undefined;
};
type microsoft_graph_operationError = {
  code?: (string | null) | undefined;
  message?: (string | null) | undefined;
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
type microsoft_graph_resourceSpecificPermissionGrant = {
  id?: string | undefined;
  deletedDateTime?: (string | null) | undefined;
  clientAppId?: (string | null) | undefined;
  clientId?: (string | null) | undefined;
  permission?: (string | null) | undefined;
  permissionType?: (string | null) | undefined;
  resourceAppId?: (string | null) | undefined;
};
type microsoft_graph_teamsTab = {
  id?: string | undefined;
  configuration?: microsoft_graph_teamsTabConfiguration | undefined;
  displayName?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  teamsApp?: microsoft_graph_teamsApp | undefined;
};
type microsoft_graph_teamsTabConfiguration = {
  contentUrl?: (string | null) | undefined;
  entityId?: (string | null) | undefined;
  removeUrl?: (string | null) | undefined;
  websiteUrl?: (string | null) | undefined;
};
type microsoft_graph_chatMessage = {
  id?: string | undefined;
  attachments?: Array<microsoft_graph_chatMessageAttachment> | undefined;
  body?: microsoft_graph_itemBody | undefined;
  channelIdentity?: microsoft_graph_channelIdentity | undefined;
  chatId?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  deletedDateTime?: (string | null) | undefined;
  etag?: (string | null) | undefined;
  eventDetail?: microsoft_graph_eventMessageDetail | undefined;
  from?: microsoft_graph_chatMessageFromIdentitySet | undefined;
  importance?: microsoft_graph_chatMessageImportance | undefined;
  lastEditedDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  locale?: string | undefined;
  mentions?: Array<microsoft_graph_chatMessageMention> | undefined;
  messageHistory?: Array<microsoft_graph_chatMessageHistoryItem> | undefined;
  messageType?: microsoft_graph_chatMessageType | undefined;
  policyViolation?: microsoft_graph_chatMessagePolicyViolation | undefined;
  reactions?: Array<microsoft_graph_chatMessageReaction> | undefined;
  replyToId?: (string | null) | undefined;
  subject?: (string | null) | undefined;
  summary?: (string | null) | undefined;
  webUrl?: (string | null) | undefined;
  hostedContents?: Array<microsoft_graph_chatMessageHostedContent> | undefined;
  replies?: Array<microsoft_graph_chatMessage> | undefined;
};
type microsoft_graph_contactFolder = {
  id?: string | undefined;
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
};
type microsoft_graph_contact = {
  id?: string | undefined;
  displayName?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  title?: (string | null) | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  categories?: Array<string | null> | undefined;
  changeKey?: (string | null) | undefined;
  assistantName?: (string | null) | undefined;
  birthday?: (string | null) | undefined;
  businessAddress?: microsoft_graph_physicalAddress | undefined;
  businessHomePage?: (string | null) | undefined;
  businessPhones?: Array<string | null> | undefined;
  children?: Array<string | null> | undefined;
  companyName?: (string | null) | undefined;
  department?: (string | null) | undefined;
  emailAddresses?: Array<microsoft_graph_emailAddress> | undefined;
  fileAs?: (string | null) | undefined;
  generation?: (string | null) | undefined;
  givenName?: (string | null) | undefined;
  homeAddress?: microsoft_graph_physicalAddress | undefined;
  homePhones?: Array<string | null> | undefined;
  imAddresses?: Array<string | null> | undefined;
  initials?: (string | null) | undefined;
} & {
  [key: string]: any;
};
type microsoft_graph_singleValueLegacyExtendedProperty = {
  id?: string | undefined;
  value?: (string | null) | undefined;
};
type microsoft_graph_multiValueLegacyExtendedProperty = {
  id?: string | undefined;
  value?: Array<string | null> | undefined;
};
type microsoft_graph_physicalAddress = {
  city?: (string | null) | undefined;
  countryOrRegion?: (string | null) | undefined;
  postalCode?: (string | null) | undefined;
  state?: (string | null) | undefined;
  street?: (string | null) | undefined;
};
type microsoft_graph_emailAddress = {
  address?: (string | null) | undefined;
  name?: (string | null) | undefined;
};
type microsoft_graph_contentType = {
  id?: string | undefined;
  associatedHubsUrls?: Array<string | null> | undefined;
  description?: (string | null) | undefined;
  documentSet?: microsoft_graph_documentSet | undefined;
  documentTemplate?: microsoft_graph_documentSetContent | undefined;
  group?: (string | null) | undefined;
  hidden?: (boolean | null) | undefined;
  inheritedFrom?: microsoft_graph_itemReference | undefined;
  isBuiltIn?: (boolean | null) | undefined;
  name?: (string | null) | undefined;
  order?: microsoft_graph_contentTypeOrder | undefined;
  parentId?: (string | null) | undefined;
  propagateChanges?: (boolean | null) | undefined;
  readOnly?: (boolean | null) | undefined;
  sealed?: (boolean | null) | undefined;
  base?: microsoft_graph_contentType | undefined;
  baseTypes?: Array<microsoft_graph_contentType> | undefined;
  columnLinks?: Array<microsoft_graph_columnLink> | undefined;
  columnPositions?: Array<microsoft_graph_columnDefinition> | undefined;
  columns?: Array<microsoft_graph_columnDefinition> | undefined;
};
type microsoft_graph_documentSet = {
  allowedContentTypes?: Array<microsoft_graph_contentTypeInfo> | undefined;
  defaultContents?: Array<microsoft_graph_documentSetContent> | undefined;
  propagateWelcomePageChanges?: (boolean | null) | undefined;
  shouldPrefixNameToFile?: (boolean | null) | undefined;
  welcomePageUrl?: (string | null) | undefined;
  sharedColumns?: Array<microsoft_graph_columnDefinition> | undefined;
  welcomePageColumns?: Array<microsoft_graph_columnDefinition> | undefined;
};
type microsoft_graph_contentTypeInfo = {
  id?: (string | null) | undefined;
  name?: (string | null) | undefined;
};
type microsoft_graph_documentSetContent = {
  contentType?: microsoft_graph_contentTypeInfo | undefined;
  fileName?: (string | null) | undefined;
  folderName?: (string | null) | undefined;
};
type microsoft_graph_columnDefinition = {
  id?: string | undefined;
  name?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  description?: (string | null) | undefined;
  type?: microsoft_graph_columnTypes | undefined;
  boolean?: microsoft_graph_booleanColumn | undefined;
  calculated?: microsoft_graph_calculatedColumn | undefined;
  choice?: microsoft_graph_choiceColumn | undefined;
  columnGroup?: (string | null) | undefined;
  contentApprovalStatus?: microsoft_graph_contentApprovalStatusColumn | undefined;
  currency?: microsoft_graph_currencyColumn | undefined;
  dateTime?: microsoft_graph_dateTimeColumn | undefined;
  defaultValue?: microsoft_graph_defaultColumnValue | undefined;
  enforceUniqueValues?: (boolean | null) | undefined;
  geolocation?: microsoft_graph_geolocationColumn | undefined;
  hidden?: (boolean | null) | undefined;
  hyperlinkOrPicture?: microsoft_graph_hyperlinkOrPictureColumn | undefined;
  indexed?: (boolean | null) | undefined;
  isDeletable?: (boolean | null) | undefined;
  isReorderable?: (boolean | null) | undefined;
  isSealed?: (boolean | null) | undefined;
  lookup?: microsoft_graph_lookupColumn | undefined;
  number?: microsoft_graph_numberColumn | undefined;
  personOrGroup?: microsoft_graph_personOrGroupColumn | undefined;
  propagateChanges?: (boolean | null) | undefined;
} & {
  [key: string]: any;
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
type microsoft_graph_booleanColumn = {};
type microsoft_graph_calculatedColumn = {
  format?: (string | null) | undefined;
  formula?: (string | null) | undefined;
  outputType?: (string | null) | undefined;
};
type microsoft_graph_choiceColumn = {
  allowTextEntry?: (boolean | null) | undefined;
  choices?: Array<string | null> | undefined;
  displayAs?: (string | null) | undefined;
};
type microsoft_graph_contentApprovalStatusColumn = {};
type microsoft_graph_currencyColumn = {
  locale?: (string | null) | undefined;
};
type microsoft_graph_dateTimeColumn = {
  displayAs?: (string | null) | undefined;
  format?: (string | null) | undefined;
};
type microsoft_graph_defaultColumnValue = {
  formula?: (string | null) | undefined;
  value?: (string | null) | undefined;
};
type microsoft_graph_geolocationColumn = {};
type microsoft_graph_hyperlinkOrPictureColumn = {
  isPicture?: (boolean | null) | undefined;
};
type microsoft_graph_lookupColumn = {
  allowMultipleValues?: (boolean | null) | undefined;
  allowUnlimitedLength?: (boolean | null) | undefined;
  columnName?: (string | null) | undefined;
  listId?: (string | null) | undefined;
  primaryLookupColumnId?: (string | null) | undefined;
};
type microsoft_graph_numberColumn = {
  decimalPlaces?: (string | null) | undefined;
  displayAs?: (string | null) | undefined;
  maximum?: (number | null) | undefined;
  minimum?: (number | null) | undefined;
};
type microsoft_graph_personOrGroupColumn = {
  allowMultipleSelection?: (boolean | null) | undefined;
  chooseFromType?: (string | null) | undefined;
  displayAs?: (string | null) | undefined;
};
type microsoft_graph_contentTypeOrder = {
  default?: (boolean | null) | undefined;
  position?: (number | null) | undefined;
};
type microsoft_graph_columnLink = {
  id?: string | undefined;
  name?: (string | null) | undefined;
};
type microsoft_graph_drive = {
  id?: string | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  createdDateTime?: string | undefined;
  description?: (string | null) | undefined;
  eTag?: (string | null) | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: string | undefined;
  name?: (string | null) | undefined;
  parentReference?: microsoft_graph_itemReference | undefined;
  webUrl?: (string | null) | undefined;
  createdByUser?: microsoft_graph_user | undefined;
  lastModifiedByUser?: microsoft_graph_user | undefined;
  driveType?: (string | null) | undefined;
  owner?: microsoft_graph_identitySet | undefined;
  quota?: microsoft_graph_quota | undefined;
  sharePointIds?: microsoft_graph_sharepointIds | undefined;
  system?: microsoft_graph_systemFacet | undefined;
  bundles?: Array<microsoft_graph_driveItem> | undefined;
  following?: Array<microsoft_graph_driveItem> | undefined;
  items?: Array<microsoft_graph_driveItem> | undefined;
  list?: microsoft_graph_list | undefined;
  root?: microsoft_graph_driveItem | undefined;
  special?: Array<microsoft_graph_driveItem> | undefined;
};
type microsoft_graph_quota = {
  deleted?: (number | null) | undefined;
  remaining?: (number | null) | undefined;
  state?: (string | null) | undefined;
  storagePlanInformation?: microsoft_graph_storagePlanInformation | undefined;
  total?: (number | null) | undefined;
  used?: (number | null) | undefined;
};
type microsoft_graph_storagePlanInformation = {
  upgradeAvailable?: (boolean | null) | undefined;
};
type microsoft_graph_systemFacet = {};
type microsoft_graph_listInfo = {
  contentTypesEnabled?: (boolean | null) | undefined;
  hidden?: (boolean | null) | undefined;
  template?: (string | null) | undefined;
};
type microsoft_graph_listItem = {
  id?: string | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  createdDateTime?: string | undefined;
  description?: (string | null) | undefined;
  eTag?: (string | null) | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: string | undefined;
  name?: (string | null) | undefined;
  parentReference?: microsoft_graph_itemReference | undefined;
  webUrl?: (string | null) | undefined;
  createdByUser?: microsoft_graph_user | undefined;
  lastModifiedByUser?: microsoft_graph_user | undefined;
  contentType?: microsoft_graph_contentTypeInfo | undefined;
  deleted?: microsoft_graph_deleted | undefined;
  sharepointIds?: microsoft_graph_sharepointIds | undefined;
  analytics?: microsoft_graph_itemAnalytics | undefined;
  documentSetVersions?: Array<microsoft_graph_documentSetVersion> | undefined;
  driveItem?: microsoft_graph_driveItem | undefined;
  fields?: microsoft_graph_fieldValueSet | undefined;
  versions?: Array<microsoft_graph_listItemVersion> | undefined;
};
type microsoft_graph_itemAnalytics = {
  id?: string | undefined;
  allTime?: microsoft_graph_itemActivityStat | undefined;
  itemActivityStats?: Array<microsoft_graph_itemActivityStat> | undefined;
  lastSevenDays?: microsoft_graph_itemActivityStat | undefined;
};
type microsoft_graph_itemActivityStat = {
  id?: string | undefined;
  access?: microsoft_graph_itemActionStat | undefined;
  create?: microsoft_graph_itemActionStat | undefined;
  delete?: microsoft_graph_itemActionStat | undefined;
  edit?: microsoft_graph_itemActionStat | undefined;
  endDateTime?: (string | null) | undefined;
  incompleteData?: microsoft_graph_incompleteData | undefined;
  isTrending?: (boolean | null) | undefined;
  move?: microsoft_graph_itemActionStat | undefined;
  startDateTime?: (string | null) | undefined;
  activities?: Array<microsoft_graph_itemActivity> | undefined;
};
type microsoft_graph_itemActionStat = {
  actionCount?: (number | null) | undefined;
  actorCount?: (number | null) | undefined;
};
type microsoft_graph_incompleteData = {
  missingDataBeforeDateTime?: (string | null) | undefined;
  wasThrottled?: (boolean | null) | undefined;
};
type microsoft_graph_itemActivity = {
  id?: string | undefined;
  access?: microsoft_graph_accessAction | undefined;
  activityDateTime?: (string | null) | undefined;
  actor?: microsoft_graph_identitySet | undefined;
  driveItem?: microsoft_graph_driveItem | undefined;
};
type microsoft_graph_accessAction = {};
type microsoft_graph_documentSetVersion = {
  id?: string | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  publication?: microsoft_graph_publicationFacet | undefined;
  fields?: microsoft_graph_fieldValueSet | undefined;
  comment?: (string | null) | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  createdDateTime?: (string | null) | undefined;
  items?: Array<microsoft_graph_documentSetVersionItem> | undefined;
  shouldCaptureMinorVersion?: (boolean | null) | undefined;
};
type microsoft_graph_publicationFacet = {
  checkedOutBy?: microsoft_graph_identitySet | undefined;
  level?: (string | null) | undefined;
  versionId?: (string | null) | undefined;
};
type microsoft_graph_fieldValueSet = {
  id?: string | undefined;
};
type microsoft_graph_documentSetVersionItem = {
  itemId?: (string | null) | undefined;
  title?: (string | null) | undefined;
  versionId?: (string | null) | undefined;
};
type microsoft_graph_listItemVersion = {
  id?: string | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  publication?: microsoft_graph_publicationFacet | undefined;
  fields?: microsoft_graph_fieldValueSet | undefined;
};
type microsoft_graph_richLongRunningOperation = {
  id?: string | undefined;
  createdDateTime?: (string | null) | undefined;
  lastActionDateTime?: (string | null) | undefined;
  resourceLocation?: (string | null) | undefined;
  status?: microsoft_graph_longRunningOperationStatus | undefined;
  statusDetail?: (string | null) | undefined;
  error?: microsoft_graph_publicError | undefined;
  percentageComplete?: (number | null) | undefined;
  resourceId?: (string | null) | undefined;
  type?: (string | null) | undefined;
};
type microsoft_graph_longRunningOperationStatus =
  | 'notStarted'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'unknownFutureValue';
type microsoft_graph_publicError = {
  code?: (string | null) | undefined;
  details?: Array<microsoft_graph_publicErrorDetail> | undefined;
  innerError?: microsoft_graph_publicInnerError | undefined;
  message?: (string | null) | undefined;
  target?: (string | null) | undefined;
};
type microsoft_graph_publicErrorDetail = {
  code?: (string | null) | undefined;
  message?: (string | null) | undefined;
  target?: (string | null) | undefined;
};
type microsoft_graph_publicInnerError = {
  code?: (string | null) | undefined;
  details?: Array<microsoft_graph_publicErrorDetail> | undefined;
  message?: (string | null) | undefined;
  target?: (string | null) | undefined;
};
type microsoft_graph_subscription = {
  id?: string | undefined;
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
};
type microsoft_graph_list = {
  id?: string | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  createdDateTime?: string | undefined;
  description?: (string | null) | undefined;
  eTag?: (string | null) | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: string | undefined;
  name?: (string | null) | undefined;
  parentReference?: microsoft_graph_itemReference | undefined;
  webUrl?: (string | null) | undefined;
  createdByUser?: microsoft_graph_user | undefined;
  lastModifiedByUser?: microsoft_graph_user | undefined;
  displayName?: (string | null) | undefined;
  list?: microsoft_graph_listInfo | undefined;
  sharepointIds?: microsoft_graph_sharepointIds | undefined;
  system?: microsoft_graph_systemFacet | undefined;
  columns?: Array<microsoft_graph_columnDefinition> | undefined;
  contentTypes?: Array<microsoft_graph_contentType> | undefined;
  drive?: microsoft_graph_drive | undefined;
  items?: Array<microsoft_graph_listItem> | undefined;
  operations?: Array<microsoft_graph_richLongRunningOperation> | undefined;
  subscriptions?: Array<microsoft_graph_subscription> | undefined;
};
type microsoft_graph_mailFolder = {
  id?: string | undefined;
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
};
type microsoft_graph_messageRule = {
  id?: string | undefined;
  actions?: microsoft_graph_messageRuleActions | undefined;
  conditions?: microsoft_graph_messageRulePredicates | undefined;
  displayName?: (string | null) | undefined;
  exceptions?: microsoft_graph_messageRulePredicates | undefined;
  hasError?: (boolean | null) | undefined;
  isEnabled?: (boolean | null) | undefined;
  isReadOnly?: (boolean | null) | undefined;
  sequence?: (number | null) | undefined;
};
type microsoft_graph_messageRuleActions = {
  assignCategories?: Array<string | null> | undefined;
  copyToFolder?: (string | null) | undefined;
  delete?: (boolean | null) | undefined;
  forwardAsAttachmentTo?: Array<microsoft_graph_recipient> | undefined;
  forwardTo?: Array<microsoft_graph_recipient> | undefined;
  markAsRead?: (boolean | null) | undefined;
  markImportance?: microsoft_graph_importance | undefined;
  moveToFolder?: (string | null) | undefined;
  permanentDelete?: (boolean | null) | undefined;
  redirectTo?: Array<microsoft_graph_recipient> | undefined;
  stopProcessingRules?: (boolean | null) | undefined;
};
type microsoft_graph_recipient = {
  emailAddress?: microsoft_graph_emailAddress | undefined;
};
type microsoft_graph_importance = 'low' | 'normal' | 'high';
type microsoft_graph_messageRulePredicates = {
  sensitivity?: microsoft_graph_sensitivity | undefined;
  importance?: microsoft_graph_importance | undefined;
  bodyContains?: Array<string | null> | undefined;
  bodyOrSubjectContains?: Array<string | null> | undefined;
  categories?: Array<string | null> | undefined;
  fromAddresses?: Array<microsoft_graph_recipient> | undefined;
  hasAttachments?: (boolean | null) | undefined;
  headerContains?: Array<string | null> | undefined;
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
  messageActionFlag?: microsoft_graph_messageActionFlag | undefined;
  notSentToMe?: (boolean | null) | undefined;
  recipientContains?: Array<string | null> | undefined;
  senderContains?: Array<string | null> | undefined;
  sentCcMe?: (boolean | null) | undefined;
  sentOnlyToMe?: (boolean | null) | undefined;
} & {
  [key: string]: any;
};
type microsoft_graph_sensitivity = 'normal' | 'personal' | 'private' | 'confidential';
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
type microsoft_graph_message = {
  id?: string | undefined;
  createdDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  body?: microsoft_graph_itemBody | undefined;
  subject?: (string | null) | undefined;
  attachments?: Array<microsoft_graph_attachment> | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  importance?: microsoft_graph_importance | undefined;
  from?: microsoft_graph_recipient | undefined;
  toRecipients?: Array<microsoft_graph_recipient> | undefined;
  categories?: Array<string | null> | undefined;
  changeKey?: (string | null) | undefined;
  bccRecipients?: Array<microsoft_graph_recipient> | undefined;
  bodyPreview?: (string | null) | undefined;
  ccRecipients?: Array<microsoft_graph_recipient> | undefined;
  conversationId?: (string | null) | undefined;
  conversationIndex?: (string | null) | undefined;
  flag?: microsoft_graph_followupFlag | undefined;
  hasAttachments?: (boolean | null) | undefined;
  inferenceClassification?: microsoft_graph_inferenceClassificationType | undefined;
  internetMessageHeaders?: Array<microsoft_graph_internetMessageHeader> | undefined;
  internetMessageId?: (string | null) | undefined;
  isDeliveryReceiptRequested?: (boolean | null) | undefined;
  isDraft?: (boolean | null) | undefined;
} & {
  [key: string]: any;
};
type microsoft_graph_attachment = {
  id?: string | undefined;
  contentType?: (string | null) | undefined;
  isInline?: boolean | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  name?: (string | null) | undefined;
  size?: number | undefined;
};
type microsoft_graph_followupFlag = {
  completedDateTime?: microsoft_graph_dateTimeTimeZone | undefined;
  dueDateTime?: microsoft_graph_dateTimeTimeZone | undefined;
  flagStatus?: microsoft_graph_followupFlagStatus | undefined;
  startDateTime?: microsoft_graph_dateTimeTimeZone | undefined;
};
type microsoft_graph_dateTimeTimeZone = {
  dateTime?: string | undefined;
  timeZone?: (string | null) | undefined;
};
type microsoft_graph_followupFlagStatus = 'notFlagged' | 'complete' | 'flagged';
type microsoft_graph_inferenceClassificationType = 'focused' | 'other';
type microsoft_graph_internetMessageHeader = {
  name?: (string | null) | undefined;
  value?: (string | null) | undefined;
};
type microsoft_graph_notebook = {
  id?: string | undefined;
  self?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  isDefault?: (boolean | null) | undefined;
  isShared?: (boolean | null) | undefined;
  links?: microsoft_graph_notebookLinks | undefined;
  sectionGroupsUrl?: (string | null) | undefined;
  sectionsUrl?: (string | null) | undefined;
  userRole?: microsoft_graph_onenoteUserRole | undefined;
  sectionGroups?: Array<microsoft_graph_sectionGroup> | undefined;
  sections?: Array<microsoft_graph_onenoteSection> | undefined;
};
type microsoft_graph_notebookLinks = {
  oneNoteClientUrl?: microsoft_graph_externalLink | undefined;
  oneNoteWebUrl?: microsoft_graph_externalLink | undefined;
};
type microsoft_graph_externalLink = {
  href?: (string | null) | undefined;
};
type microsoft_graph_onenoteUserRole = 'None' | 'Owner' | 'Contributor' | 'Reader';
type microsoft_graph_sectionLinks = {
  oneNoteClientUrl?: microsoft_graph_externalLink | undefined;
  oneNoteWebUrl?: microsoft_graph_externalLink | undefined;
};
type microsoft_graph_pageLinks = {
  oneNoteClientUrl?: microsoft_graph_externalLink | undefined;
  oneNoteWebUrl?: microsoft_graph_externalLink | undefined;
};
type microsoft_graph_onenotePage = {
  id?: string | undefined;
  self?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  content?: (string | null) | undefined;
  contentUrl?: (string | null) | undefined;
  createdByAppId?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  level?: (number | null) | undefined;
  links?: microsoft_graph_pageLinks | undefined;
  order?: (number | null) | undefined;
  title?: (string | null) | undefined;
  userTags?: Array<string | null> | undefined;
  parentNotebook?: microsoft_graph_notebook | undefined;
  parentSection?: microsoft_graph_onenoteSection | undefined;
};
type microsoft_graph_onenoteSection = {
  id?: string | undefined;
  self?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  isDefault?: (boolean | null) | undefined;
  links?: microsoft_graph_sectionLinks | undefined;
  pagesUrl?: (string | null) | undefined;
  pages?: Array<microsoft_graph_onenotePage> | undefined;
  parentNotebook?: microsoft_graph_notebook | undefined;
  parentSectionGroup?: microsoft_graph_sectionGroup | undefined;
};
type microsoft_graph_post = {
  id?: string | undefined;
  categories?: Array<string | null> | undefined;
  changeKey?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  body?: microsoft_graph_itemBody | undefined;
  conversationId?: (string | null) | undefined;
  conversationThreadId?: (string | null) | undefined;
  from?: microsoft_graph_recipient | undefined;
  hasAttachments?: boolean | undefined;
  newParticipants?: Array<microsoft_graph_recipient> | undefined;
  receivedDateTime?: string | undefined;
  sender?: microsoft_graph_recipient | undefined;
  attachments?: Array<microsoft_graph_attachment> | undefined;
  extensions?: Array<microsoft_graph_extension> | undefined;
  inReplyTo?: microsoft_graph_post | undefined;
  multiValueExtendedProperties?:
    | Array<microsoft_graph_multiValueLegacyExtendedProperty>
    | undefined;
  singleValueExtendedProperties?:
    | Array<microsoft_graph_singleValueLegacyExtendedProperty>
    | undefined;
};
type microsoft_graph_extension = {
  id?: string | undefined;
};
type microsoft_graph_sectionGroup = {
  id?: string | undefined;
  self?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  createdBy?: microsoft_graph_identitySet | undefined;
  displayName?: (string | null) | undefined;
  lastModifiedBy?: microsoft_graph_identitySet | undefined;
  lastModifiedDateTime?: (string | null) | undefined;
  sectionGroupsUrl?: (string | null) | undefined;
  sectionsUrl?: (string | null) | undefined;
  parentNotebook?: microsoft_graph_notebook | undefined;
  parentSectionGroup?: microsoft_graph_sectionGroup | undefined;
  sectionGroups?: Array<microsoft_graph_sectionGroup> | undefined;
  sections?: Array<microsoft_graph_onenoteSection> | undefined;
};
type microsoft_graph_sensitivityLabel = {
  id?: string | undefined;
  actionSource?: microsoft_graph_labelActionSource | undefined;
  autoTooltip?: (string | null) | undefined;
  description?: (string | null) | undefined;
  displayName?: (string | null) | undefined;
  hasProtection?: (boolean | null) | undefined;
  isDefault?: (boolean | null) | undefined;
  isEndpointProtectionEnabled?: (boolean | null) | undefined;
  isScopedToUser?: (boolean | null) | undefined;
  locale?: (string | null) | undefined;
  name?: (string | null) | undefined;
  priority?: (number | null) | undefined;
  toolTip?: (string | null) | undefined;
  rights?: microsoft_graph_usageRightsIncluded | undefined;
  sublabels?: Array<microsoft_graph_sensitivityLabel> | undefined;
};
type microsoft_graph_labelActionSource =
  | 'manual'
  | 'automatic'
  | 'recommended'
  | 'none'
  | 'unknownFutureValue';
type microsoft_graph_usageRightsIncluded = {
  id?: string | undefined;
  ownerEmail?: (string | null) | undefined;
  userEmail?: (string | null) | undefined;
  value?: microsoft_graph_usageRights | undefined;
};
type microsoft_graph_usageRights =
  | 'unknown'
  | 'docEdit'
  | 'edit'
  | 'comment'
  | 'export'
  | 'forward'
  | 'owner'
  | 'print'
  | 'reply'
  | 'replyAll'
  | 'view'
  | 'extract'
  | 'viewRightsData'
  | 'editRightsData'
  | 'objModel'
  | 'accessDenied'
  | 'userDefinedProtectionTypeNotSupportedException'
  | 'encryptedProtectionTypeNotSupportedException'
  | 'purviewClaimsChallengeNotSupportedException'
  | 'exception'
  | 'labelNotFoundException'
  | 'unknownFutureValue';
type microsoft_graph_sharedWithChannelTeamInfo = {
  id?: string | undefined;
  displayName?: (string | null) | undefined;
  tenantId?: (string | null) | undefined;
  team?: microsoft_graph_team | undefined;
  isHostTeam?: (boolean | null) | undefined;
  allowedMembers?: Array<microsoft_graph_conversationMember> | undefined;
};
type microsoft_graph_team = {
  id?: string | undefined;
  displayName?: (string | null) | undefined;
  description?: (string | null) | undefined;
  createdDateTime?: (string | null) | undefined;
  classification?: (string | null) | undefined;
  firstChannelName?: (string | null) | undefined;
  funSettings?: microsoft_graph_teamFunSettings | undefined;
  guestSettings?: microsoft_graph_teamGuestSettings | undefined;
  internalId?: (string | null) | undefined;
  isArchived?: (boolean | null) | undefined;
  memberSettings?: microsoft_graph_teamMemberSettings | undefined;
  messagingSettings?: microsoft_graph_teamMessagingSettings | undefined;
  specialization?: microsoft_graph_teamSpecialization | undefined;
  summary?: microsoft_graph_teamSummary | undefined;
  tenantId?: (string | null) | undefined;
  visibility?: microsoft_graph_teamVisibilityType | undefined;
  webUrl?: (string | null) | undefined;
  allChannels?: Array<microsoft_graph_channel> | undefined;
  channels?: Array<microsoft_graph_channel> | undefined;
  group?: microsoft_graph_group | undefined;
  incomingChannels?: Array<microsoft_graph_channel> | undefined;
  installedApps?: Array<microsoft_graph_teamsAppInstallation> | undefined;
  members?: Array<microsoft_graph_conversationMember> | undefined;
  operations?: Array<microsoft_graph_teamsAsyncOperation> | undefined;
  permissionGrants?: Array<microsoft_graph_resourceSpecificPermissionGrant> | undefined;
} & {
  [key: string]: any;
};
type microsoft_graph_workbookChart = {
  id?: string | undefined;
  height?: (number | null) | undefined;
  left?: (number | null) | undefined;
  name?: (string | null) | undefined;
  top?: (number | null) | undefined;
  width?: (number | null) | undefined;
  axes?: microsoft_graph_workbookChartAxes | undefined;
  dataLabels?: microsoft_graph_workbookChartDataLabels | undefined;
  format?: microsoft_graph_workbookChartAreaFormat | undefined;
  legend?: microsoft_graph_workbookChartLegend | undefined;
  series?: Array<microsoft_graph_workbookChartSeries> | undefined;
  title?: microsoft_graph_workbookChartTitle | undefined;
  worksheet?: microsoft_graph_workbookWorksheet | undefined;
};
type microsoft_graph_workbookChartAxes = {
  id?: string | undefined;
  categoryAxis?: microsoft_graph_workbookChartAxis | undefined;
  seriesAxis?: microsoft_graph_workbookChartAxis | undefined;
  valueAxis?: microsoft_graph_workbookChartAxis | undefined;
};
type microsoft_graph_workbookChartAxis = {
  id?: string | undefined;
  majorUnit?: unknown | undefined;
  maximum?: unknown | undefined;
  minimum?: unknown | undefined;
  minorUnit?: unknown | undefined;
  format?: microsoft_graph_workbookChartAxisFormat | undefined;
  majorGridlines?: microsoft_graph_workbookChartGridlines | undefined;
  minorGridlines?: microsoft_graph_workbookChartGridlines | undefined;
  title?: microsoft_graph_workbookChartAxisTitle | undefined;
};
type microsoft_graph_workbookChartAxisFormat = {
  id?: string | undefined;
  font?: microsoft_graph_workbookChartFont | undefined;
  line?: microsoft_graph_workbookChartLineFormat | undefined;
};
type microsoft_graph_workbookChartFont = {
  id?: string | undefined;
  bold?: (boolean | null) | undefined;
  color?: (string | null) | undefined;
  italic?: (boolean | null) | undefined;
  name?: (string | null) | undefined;
  size?: (number | null) | undefined;
  underline?: (string | null) | undefined;
};
type microsoft_graph_workbookChartLineFormat = {
  id?: string | undefined;
  color?: (string | null) | undefined;
};
type microsoft_graph_workbookChartGridlines = {
  id?: string | undefined;
  visible?: boolean | undefined;
  format?: microsoft_graph_workbookChartGridlinesFormat | undefined;
};
type microsoft_graph_workbookChartGridlinesFormat = {
  id?: string | undefined;
  line?: microsoft_graph_workbookChartLineFormat | undefined;
};
type microsoft_graph_workbookChartAxisTitle = {
  id?: string | undefined;
  text?: (string | null) | undefined;
  visible?: boolean | undefined;
  format?: microsoft_graph_workbookChartAxisTitleFormat | undefined;
};
type microsoft_graph_workbookChartAxisTitleFormat = {
  id?: string | undefined;
  font?: microsoft_graph_workbookChartFont | undefined;
};
type microsoft_graph_workbookChartDataLabels = {
  id?: string | undefined;
  position?: (string | null) | undefined;
  separator?: (string | null) | undefined;
  showBubbleSize?: (boolean | null) | undefined;
  showCategoryName?: (boolean | null) | undefined;
  showLegendKey?: (boolean | null) | undefined;
  showPercentage?: (boolean | null) | undefined;
  showSeriesName?: (boolean | null) | undefined;
  showValue?: (boolean | null) | undefined;
  format?: microsoft_graph_workbookChartDataLabelFormat | undefined;
};
type microsoft_graph_workbookChartDataLabelFormat = {
  id?: string | undefined;
  fill?: microsoft_graph_workbookChartFill | undefined;
  font?: microsoft_graph_workbookChartFont | undefined;
};
type microsoft_graph_workbookChartFill = {
  id?: string | undefined;
};
type microsoft_graph_workbookChartAreaFormat = {
  id?: string | undefined;
  fill?: microsoft_graph_workbookChartFill | undefined;
  font?: microsoft_graph_workbookChartFont | undefined;
};
type microsoft_graph_workbookChartLegend = {
  id?: string | undefined;
  overlay?: (boolean | null) | undefined;
  position?: (string | null) | undefined;
  visible?: boolean | undefined;
  format?: microsoft_graph_workbookChartLegendFormat | undefined;
};
type microsoft_graph_workbookChartLegendFormat = {
  id?: string | undefined;
  fill?: microsoft_graph_workbookChartFill | undefined;
  font?: microsoft_graph_workbookChartFont | undefined;
};
type microsoft_graph_workbookChartSeries = {
  id?: string | undefined;
  name?: (string | null) | undefined;
  format?: microsoft_graph_workbookChartSeriesFormat | undefined;
  points?: Array<microsoft_graph_workbookChartPoint> | undefined;
};
type microsoft_graph_workbookChartSeriesFormat = {
  id?: string | undefined;
  fill?: microsoft_graph_workbookChartFill | undefined;
  line?: microsoft_graph_workbookChartLineFormat | undefined;
};
type microsoft_graph_workbookChartPoint = {
  id?: string | undefined;
  value?: unknown | undefined;
  format?: microsoft_graph_workbookChartPointFormat | undefined;
};
type microsoft_graph_workbookChartPointFormat = {
  id?: string | undefined;
  fill?: microsoft_graph_workbookChartFill | undefined;
};
type microsoft_graph_workbookChartTitle = {
  id?: string | undefined;
  overlay?: (boolean | null) | undefined;
  text?: (string | null) | undefined;
  visible?: boolean | undefined;
  format?: microsoft_graph_workbookChartTitleFormat | undefined;
};
type microsoft_graph_workbookChartTitleFormat = {
  id?: string | undefined;
  fill?: microsoft_graph_workbookChartFill | undefined;
  font?: microsoft_graph_workbookChartFont | undefined;
};
type microsoft_graph_workbookWorksheetProtection = {
  id?: string | undefined;
  options?: microsoft_graph_workbookWorksheetProtectionOptions | undefined;
  protected?: boolean | undefined;
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
};
type microsoft_graph_workbookTableColumn = {
  id?: string | undefined;
  index?: number | undefined;
  name?: (string | null) | undefined;
  values?: unknown | undefined;
  filter?: microsoft_graph_workbookFilter | undefined;
};
type microsoft_graph_workbookFilter = {
  id?: string | undefined;
  criteria?: microsoft_graph_workbookFilterCriteria | undefined;
};
type microsoft_graph_workbookFilterCriteria = {
  color?: (string | null) | undefined;
  criterion1?: (string | null) | undefined;
  criterion2?: (string | null) | undefined;
  dynamicCriteria?: string | undefined;
  filterOn?: string | undefined;
  icon?: microsoft_graph_workbookIcon | undefined;
  operator?: string | undefined;
  values?: unknown | undefined;
};
type microsoft_graph_workbookIcon = {
  index?: number | undefined;
  set?: string | undefined;
};
type microsoft_graph_workbookTableRow = {
  id?: string | undefined;
  index?: number | undefined;
  values?: unknown | undefined;
};
type microsoft_graph_workbookTableSort = {
  id?: string | undefined;
  fields?: Array<microsoft_graph_workbookSortField> | undefined;
  matchCase?: boolean | undefined;
  method?: string | undefined;
};
type microsoft_graph_workbookSortField = {
  ascending?: boolean | undefined;
  color?: (string | null) | undefined;
  dataOption?: string | undefined;
  icon?: microsoft_graph_workbookIcon | undefined;
  key?: number | undefined;
  sortOn?: string | undefined;
};
type microsoft_graph_workbookNamedItem = {
  id?: string | undefined;
  comment?: (string | null) | undefined;
  name?: (string | null) | undefined;
  scope?: string | undefined;
  type?: (string | null) | undefined;
  value?: unknown | undefined;
  visible?: boolean | undefined;
  worksheet?: microsoft_graph_workbookWorksheet | undefined;
};
type microsoft_graph_workbookPivotTable = {
  id?: string | undefined;
  name?: (string | null) | undefined;
  worksheet?: microsoft_graph_workbookWorksheet | undefined;
};
type microsoft_graph_workbookTable = {
  id?: string | undefined;
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
  sort?: microsoft_graph_workbookTableSort | undefined;
  worksheet?: microsoft_graph_workbookWorksheet | undefined;
};
type microsoft_graph_workbookWorksheet = {
  id?: string | undefined;
  name?: (string | null) | undefined;
  position?: number | undefined;
  visibility?: string | undefined;
  charts?: Array<microsoft_graph_workbookChart> | undefined;
  names?: Array<microsoft_graph_workbookNamedItem> | undefined;
  pivotTables?: Array<microsoft_graph_workbookPivotTable> | undefined;
  protection?: microsoft_graph_workbookWorksheetProtection | undefined;
  tables?: Array<microsoft_graph_workbookTable> | undefined;
};

const microsoft_graph_chatType = z.enum(['oneOnOne', 'group', 'meeting', 'unknownFutureValue']);
const microsoft_graph_migrationMode = z.enum(['inProgress', 'completed', 'unknownFutureValue']);
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
const microsoft_graph_teamworkUserIdentity = z
  .object({
    displayName: z
      .string()
      .describe(
        "The display name of the identity.For drive items, the display name might not always be available or up to date. For example, if a user changes their display name the API might show the new value in a future response, but the items associated with the user don't show up as changed when using delta."
      )
      .nullish(),
    id: z
      .string()
      .describe(
        "Unique identifier for the identity or actor. For example, in the access reviews decisions API, this property might record the id of the principal, that is, the group, user, or application that's subject to review."
      )
      .nullish(),
    userIdentityType: microsoft_graph_teamworkUserIdentityType.optional(),
  })
  .passthrough();
const microsoft_graph_teamworkOnlineMeetingInfo = z
  .object({
    calendarEventId: z
      .string()
      .describe('The identifier of the calendar event associated with the meeting.')
      .nullish(),
    joinWebUrl: z
      .string()
      .describe('The URL that users click to join or uniquely identify the meeting.')
      .nullish(),
    organizer: microsoft_graph_teamworkUserIdentity.optional(),
  })
  .passthrough();
const microsoft_graph_chatViewpoint = z
  .object({
    isHidden: z
      .boolean()
      .describe('Indicates whether the chat is hidden for the current user.')
      .nullish(),
    lastMessageReadDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Represents the dateTime up until which the current user has read chatMessages in a specific chat.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_teamsAppResourceSpecificPermissionType = z.enum([
  'delegated',
  'application',
  'unknownFutureValue',
]);
const microsoft_graph_teamsAppResourceSpecificPermission = z
  .object({
    permissionType: microsoft_graph_teamsAppResourceSpecificPermissionType.optional(),
    permissionValue: z.string().describe('The name of the resource-specific permission.').nullish(),
  })
  .passthrough();
const microsoft_graph_teamsAppPermissionSet = z
  .object({
    resourceSpecificPermissions: z
      .array(microsoft_graph_teamsAppResourceSpecificPermission)
      .describe('A collection of resource-specific permissions.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_teamsAppDistributionMethod = z.enum([
  'store',
  'organization',
  'sideloaded',
  'unknownFutureValue',
]);
const microsoft_graph_teamsAppAuthorization = z
  .object({
    clientAppId: z
      .string()
      .describe('The registration ID of the Microsoft Entra app ID associated with the teamsApp.')
      .nullish(),
    requiredPermissionSet: microsoft_graph_teamsAppPermissionSet.optional(),
  })
  .passthrough();
const microsoft_graph_identity = z
  .object({
    displayName: z
      .string()
      .describe(
        "The display name of the identity.For drive items, the display name might not always be available or up to date. For example, if a user changes their display name the API might show the new value in a future response, but the items associated with the user don't show up as changed when using delta."
      )
      .nullish(),
    id: z
      .string()
      .describe(
        "Unique identifier for the identity or actor. For example, in the access reviews decisions API, this property might record the id of the principal, that is, the group, user, or application that's subject to review."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_identitySet = z
  .object({
    application: microsoft_graph_identity.optional(),
    device: microsoft_graph_identity.optional(),
    user: microsoft_graph_identity.optional(),
  })
  .passthrough();
const microsoft_graph_teamsAppPublishingState = z.enum([
  'submitted',
  'rejected',
  'published',
  'unknownFutureValue',
]);
const microsoft_graph_teamworkBot = z
  .object({ id: z.string().describe('The unique identifier for an entity. Read-only.').optional() })
  .passthrough();
const microsoft_graph_teamsAppDefinition = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    authorization: microsoft_graph_teamsAppAuthorization.optional(),
    createdBy: microsoft_graph_identitySet.optional(),
    description: z.string().describe('Verbose description of the application.').nullish(),
    displayName: z
      .string()
      .describe('The name of the app provided by the app developer.')
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    publishingState: microsoft_graph_teamsAppPublishingState.optional(),
    shortDescription: z.string().describe('Short description of the application.').nullish(),
    teamsAppId: z.string().describe('The ID from the Teams app manifest.').nullish(),
    version: z.string().describe('The version number of the application.').nullish(),
    bot: microsoft_graph_teamworkBot.optional(),
  })
  .passthrough();
const microsoft_graph_teamsApp = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z
      .string()
      .describe(
        'The name of the catalog app provided by the app developer in the Microsoft Teams zip app package.'
      )
      .nullish(),
    distributionMethod: microsoft_graph_teamsAppDistributionMethod.optional(),
    externalId: z
      .string()
      .describe(
        'The ID of the catalog provided by the app developer in the Microsoft Teams zip app package.'
      )
      .nullish(),
    appDefinitions: z
      .array(microsoft_graph_teamsAppDefinition)
      .describe('The details for each version of the app.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_teamsAppInstallation = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    consentedPermissionSet: microsoft_graph_teamsAppPermissionSet.optional(),
    teamsApp: microsoft_graph_teamsApp.optional(),
    teamsAppDefinition: microsoft_graph_teamsAppDefinition.optional(),
  })
  .passthrough();
const microsoft_graph_bodyType = z.enum(['text', 'html']);
const microsoft_graph_itemBody = z
  .object({
    content: z.string().describe('The content of the item.').nullish(),
    contentType: microsoft_graph_bodyType.optional(),
  })
  .passthrough();
const microsoft_graph_eventMessageDetail = z.object({}).passthrough();
const microsoft_graph_chatMessageFromIdentitySet = z
  .object({
    application: microsoft_graph_identity.optional(),
    device: microsoft_graph_identity.optional(),
    user: microsoft_graph_identity.optional(),
  })
  .passthrough();
const microsoft_graph_chatMessageType = z.enum([
  'message',
  'chatEvent',
  'typing',
  'unknownFutureValue',
  'systemEventMessage',
]);
const microsoft_graph_chatMessageInfo = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    body: microsoft_graph_itemBody.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date time object representing the time at which message was created.')
      .nullish(),
    eventDetail: microsoft_graph_eventMessageDetail.optional(),
    from: microsoft_graph_chatMessageFromIdentitySet.optional(),
    isDeleted: z
      .boolean()
      .describe('If set to true, the original message has been deleted.')
      .nullish(),
    messageType: microsoft_graph_chatMessageType.optional(),
  })
  .passthrough();
const microsoft_graph_conversationMember = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z.string().describe('The display name of the user.').nullish(),
    roles: z
      .array(z.string().nullable())
      .describe(
        "The roles for that user. This property contains more qualifiers only when relevant - for example, if the member has owner privileges, the roles property contains owner as one of the values. Similarly, if the member is an in-tenant guest, the roles property contains guest as one of the values. A basic member shouldn't have any values specified in the roles property. An Out-of-tenant external member is assigned the owner role."
      )
      .optional(),
    visibleHistoryStartDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "The timestamp denoting how far back a conversation's history is shared with the conversation member. This property is settable only for members of a chat."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_chatMessageAttachment = z
  .object({
    content: z
      .string()
      .describe(
        'The content of the attachment. If the attachment is a rich card, set the property to the rich card object. This property and contentUrl are mutually exclusive.'
      )
      .nullish(),
    contentType: z
      .string()
      .describe(
        "The media type of the content attachment. The possible values are: reference: The attachment is a link to another file. Populate the contentURL with the link to the object.forwardedMessageReference: The attachment is a reference to a forwarded message. Populate the content with the original message context.Any contentType that is supported by the Bot Framework's Attachment object.application/vnd.microsoft.card.codesnippet: A code snippet. application/vnd.microsoft.card.announcement: An announcement header."
      )
      .nullish(),
    contentUrl: z.string().describe('The URL for the content of the attachment.').nullish(),
    id: z.string().describe('Read-only. The unique ID of the attachment.').nullish(),
    name: z.string().describe('The name of the attachment.').nullish(),
    teamsAppId: z
      .string()
      .describe(
        'The ID of the Teams app that is associated with the attachment. The property is used to attribute a Teams message card to the specified app.'
      )
      .nullish(),
    thumbnailUrl: z
      .string()
      .describe(
        'The URL to a thumbnail image that the channel can use if it supports using an alternative, smaller form of content or contentUrl. For example, if you set contentType to application/word and set contentUrl to the location of the Word document, you might include a thumbnail image that represents the document. The channel could display the thumbnail image instead of the document. When the user selects the image, the channel would open the document.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_channelIdentity = z
  .object({
    channelId: z
      .string()
      .describe('The identity of the channel in which the message was posted.')
      .nullish(),
    teamId: z
      .string()
      .describe('The identity of the team in which the message was posted.')
      .nullish(),
  })
  .passthrough();
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
const microsoft_graph_teamworkConversationIdentity = z
  .object({
    displayName: z
      .string()
      .describe(
        "The display name of the identity.For drive items, the display name might not always be available or up to date. For example, if a user changes their display name the API might show the new value in a future response, but the items associated with the user don't show up as changed when using delta."
      )
      .nullish(),
    id: z
      .string()
      .describe(
        "Unique identifier for the identity or actor. For example, in the access reviews decisions API, this property might record the id of the principal, that is, the group, user, or application that's subject to review."
      )
      .nullish(),
    conversationIdentityType: microsoft_graph_teamworkConversationIdentityType.optional(),
  })
  .passthrough();
const microsoft_graph_chatMessageMentionedIdentitySet = z
  .object({
    application: microsoft_graph_identity.optional(),
    device: microsoft_graph_identity.optional(),
    user: microsoft_graph_identity.optional(),
    conversation: microsoft_graph_teamworkConversationIdentity.optional(),
  })
  .passthrough();
const microsoft_graph_chatMessageMention = z
  .object({
    id: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        "Index of an entity being mentioned in the specified chatMessage. Matches the {index} value in the corresponding <at id='{index}'> tag in the message body."
      )
      .nullish(),
    mentioned: microsoft_graph_chatMessageMentionedIdentitySet.optional(),
    mentionText: z
      .string()
      .describe(
        "String used to represent the mention. For example, a user's display name, a team name."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_chatMessageActions = z.enum([
  'reactionAdded',
  'reactionRemoved',
  'actionUndefined',
  'unknownFutureValue',
]);
const microsoft_graph_chatMessageReactionIdentitySet = z
  .object({
    application: microsoft_graph_identity.optional(),
    device: microsoft_graph_identity.optional(),
    user: microsoft_graph_identity.optional(),
  })
  .passthrough();
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
      )
      .optional(),
    displayName: z.string().describe('The name of the reaction.').nullish(),
    reactionContentUrl: z
      .string()
      .describe('The hosted content URL for the custom reaction type.')
      .nullish(),
    reactionType: z
      .string()
      .describe(
        'The reaction type. Supported values include Unicode characters, custom, and some backward-compatible reaction types, such as like, angry, sad, laugh, heart, and surprised.'
      )
      .optional(),
    user: microsoft_graph_chatMessageReactionIdentitySet.optional(),
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
      .describe('The date and time when the message was modified.')
      .optional(),
    reaction: microsoft_graph_chatMessageReaction.optional(),
  })
  .passthrough();
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
      .nullish(),
    generalText: z
      .string()
      .describe('Explanatory text shown to the sender of the message.')
      .nullish(),
    matchedConditionDescriptions: z
      .array(z.string().nullable())
      .describe(
        "The list of improper data in the message that was detected by the data loss prevention app. Each DLP app defines its own conditions, examples include 'Credit Card Number' and 'Social Security Number'."
      )
      .optional(),
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
    dlpAction: microsoft_graph_chatMessagePolicyViolationDlpActionTypes.optional(),
    justificationText: z
      .string()
      .describe(
        'Justification text provided by the sender of the message when overriding a policy violation.'
      )
      .nullish(),
    policyTip: microsoft_graph_chatMessagePolicyViolationPolicyTip.optional(),
    userAction: microsoft_graph_chatMessagePolicyViolationUserActionTypes.optional(),
    verdictDetails: microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes.optional(),
  })
  .passthrough();
const microsoft_graph_chatMessageHostedContent = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    contentBytes: z
      .string()
      .describe('Write only. Bytes for the hosted content (such as images).')
      .nullish(),
    contentType: z
      .string()
      .describe('Write only. Content type. such as image/png, image/jpg.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_chatMessage: z.ZodType<microsoft_graph_chatMessage> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      attachments: z
        .array(microsoft_graph_chatMessageAttachment)
        .describe('References to attached objects like files, tabs, meetings etc.')
        .optional(),
      body: microsoft_graph_itemBody.optional(),
      channelIdentity: microsoft_graph_channelIdentity.optional(),
      chatId: z
        .string()
        .describe('If the message was sent in a chat, represents the identity of the chat.')
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Timestamp of when the chat message was created.')
        .nullish(),
      deletedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Read only. Timestamp at which the chat message was deleted, or null if not deleted.'
        )
        .nullish(),
      etag: z.string().describe('Read-only. Version number of the chat message.').nullish(),
      eventDetail: microsoft_graph_eventMessageDetail.optional(),
      from: microsoft_graph_chatMessageFromIdentitySet.optional(),
      importance: microsoft_graph_chatMessageImportance.optional(),
      lastEditedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          "Read only. Timestamp when edits to the chat message were made. Triggers an 'Edited' flag in the Teams UI. If no edits are made the value is null."
        )
        .nullish(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Read only. Timestamp when the chat message is created (initial setting) or modified, including when a reaction is added or removed.'
        )
        .nullish(),
      locale: z
        .string()
        .describe('Locale of the chat message set by the client. Always set to en-us.')
        .optional(),
      mentions: z
        .array(microsoft_graph_chatMessageMention)
        .describe(
          'List of entities mentioned in the chat message. Supported entities are: user, bot, team, channel, chat, and tag.'
        )
        .optional(),
      messageHistory: z
        .array(microsoft_graph_chatMessageHistoryItem)
        .describe(
          'List of activity history of a message item, including modification time and actions, such as reactionAdded, reactionRemoved, or reaction changes, on the message.'
        )
        .optional(),
      messageType: microsoft_graph_chatMessageType.optional(),
      policyViolation: microsoft_graph_chatMessagePolicyViolation.optional(),
      reactions: z
        .array(microsoft_graph_chatMessageReaction)
        .describe('Reactions for this chat message (for example, Like).')
        .optional(),
      replyToId: z
        .string()
        .describe(
          'Read-only. ID of the parent chat message or root chat message of the thread. (Only applies to chat messages in channels, not chats.)'
        )
        .nullish(),
      subject: z.string().describe('The subject of the chat message, in plaintext.').nullish(),
      summary: z
        .string()
        .describe(
          'Summary text of the chat message that could be used for push notifications and summary views or fall back views. Only applies to channel chat messages, not chat messages in a chat.'
        )
        .nullish(),
      webUrl: z.string().describe('Read-only. Link to the message in Microsoft Teams.').nullish(),
      hostedContents: z
        .array(microsoft_graph_chatMessageHostedContent)
        .describe(
          'Content in a message hosted by Microsoft Teams - for example, images or code snippets.'
        )
        .optional(),
      replies: z
        .array(microsoft_graph_chatMessage)
        .describe('Replies for a specified message. Supports $expand for channel messages.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_resourceSpecificPermissionGrant = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    deletedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Date and time when this object was deleted. Always null when the object hasn't been deleted."
      )
      .nullish(),
    clientAppId: z
      .string()
      .describe(
        'ID of the service principal of the Microsoft Entra app that has been granted access. Read-only.'
      )
      .nullish(),
    clientId: z
      .string()
      .describe('ID of the Microsoft Entra app that has been granted access. Read-only.')
      .nullish(),
    permission: z
      .string()
      .describe('The name of the resource-specific permission. Read-only.')
      .nullish(),
    permissionType: z
      .string()
      .describe(
        'The type of permission. The possible values are: Application, Delegated. Read-only.'
      )
      .nullish(),
    resourceAppId: z
      .string()
      .describe('ID of the Microsoft Entra app that is hosting the resource. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_pinnedChatMessageInfo = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    message: microsoft_graph_chatMessage.optional(),
  })
  .passthrough();
const microsoft_graph_teamsTabConfiguration = z
  .object({
    contentUrl: z
      .string()
      .describe('Url used for rendering tab contents in Teams. Required.')
      .nullish(),
    entityId: z
      .string()
      .describe('Identifier for the entity hosted by the tab provider.')
      .nullish(),
    removeUrl: z
      .string()
      .describe('Url called by Teams client when a Tab is removed using the Teams Client.')
      .nullish(),
    websiteUrl: z.string().describe('Url for showing tab contents outside of Teams.').nullish(),
  })
  .passthrough();
const microsoft_graph_teamsTab = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    configuration: microsoft_graph_teamsTabConfiguration.optional(),
    displayName: z.string().describe('Name of the tab.').nullish(),
    webUrl: z.string().describe('Deep link URL of the tab instance. Read-only.').nullish(),
    teamsApp: microsoft_graph_teamsApp.optional(),
  })
  .passthrough();
const microsoft_graph_targetedChatMessage = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Timestamp of when the chat message was created.')
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Read only. Timestamp when the chat message is created (initial setting) or modified, including when a reaction is added or removed.'
      )
      .nullish(),
    body: microsoft_graph_itemBody.optional(),
    subject: z.string().describe('The subject of the chat message, in plaintext.').nullish(),
    attachments: z
      .array(microsoft_graph_chatMessageAttachment)
      .describe('References to attached objects like files, tabs, meetings etc.')
      .optional(),
    importance: microsoft_graph_chatMessageImportance.optional(),
    from: microsoft_graph_chatMessageFromIdentitySet.optional(),
    channelIdentity: microsoft_graph_channelIdentity.optional(),
    chatId: z
      .string()
      .describe('If the message was sent in a chat, represents the identity of the chat.')
      .nullish(),
    deletedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Read only. Timestamp at which the chat message was deleted, or null if not deleted.'
      )
      .nullish(),
    etag: z.string().describe('Read-only. Version number of the chat message.').nullish(),
    eventDetail: microsoft_graph_eventMessageDetail.optional(),
    lastEditedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Read only. Timestamp when edits to the chat message were made. Triggers an 'Edited' flag in the Teams UI. If no edits are made the value is null."
      )
      .nullish(),
    locale: z
      .string()
      .describe('Locale of the chat message set by the client. Always set to en-us.')
      .optional(),
    mentions: z
      .array(microsoft_graph_chatMessageMention)
      .describe(
        'List of entities mentioned in the chat message. Supported entities are: user, bot, team, channel, chat, and tag.'
      )
      .optional(),
    messageHistory: z
      .array(microsoft_graph_chatMessageHistoryItem)
      .describe(
        'List of activity history of a message item, including modification time and actions, such as reactionAdded, reactionRemoved, or reaction changes, on the message.'
      )
      .optional(),
    messageType: microsoft_graph_chatMessageType.optional(),
    policyViolation: microsoft_graph_chatMessagePolicyViolation.optional(),
    reactions: z
      .array(microsoft_graph_chatMessageReaction)
      .describe('Reactions for this chat message (for example, Like).')
      .optional(),
    replyToId: z
      .string()
      .describe(
        'Read-only. ID of the parent chat message or root chat message of the thread. (Only applies to chat messages in channels, not chats.)'
      )
      .nullish(),
    summary: z
      .string()
      .describe(
        'Summary text of the chat message that could be used for push notifications and summary views or fall back views. Only applies to channel chat messages, not chat messages in a chat.'
      )
      .nullish(),
    webUrl: z.string().describe('Read-only. Link to the message in Microsoft Teams.').nullish(),
    hostedContents: z
      .array(microsoft_graph_chatMessageHostedContent)
      .describe(
        'Content in a message hosted by Microsoft Teams - for example, images or code snippets.'
      )
      .optional(),
    replies: z
      .array(microsoft_graph_chatMessage)
      .describe('Replies for a specified message. Supports $expand for channel messages.')
      .optional(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_chat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    chatType: microsoft_graph_chatType.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time at which the chat was created. Read-only.')
      .nullish(),
    isHiddenForAllMembers: z
      .boolean()
      .describe('Indicates whether the chat is hidden for all its members. Read-only.')
      .nullish(),
    lastUpdatedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time at which the chat was renamed or the list of members was last changed. Read-only.'
      )
      .nullish(),
    migrationMode: microsoft_graph_migrationMode.optional(),
    onlineMeetingInfo: microsoft_graph_teamworkOnlineMeetingInfo.optional(),
    originalCreatedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Timestamp of the original creation time for the chat. The value is null if the chat never entered migration mode.'
      )
      .nullish(),
    tenantId: z
      .string()
      .describe('The identifier of the tenant in which the chat was created. Read-only.')
      .nullish(),
    topic: z
      .string()
      .describe('(Optional) Subject or topic for the chat. Only available for group chats.')
      .nullish(),
    viewpoint: microsoft_graph_chatViewpoint.optional(),
    webUrl: z
      .string()
      .describe(
        'The URL for the chat in Microsoft Teams. The URL should be treated as an opaque blob, and not parsed. Read-only.'
      )
      .nullish(),
    installedApps: z
      .array(microsoft_graph_teamsAppInstallation)
      .describe('A collection of all the apps in the chat. Nullable.')
      .optional(),
    lastMessagePreview: microsoft_graph_chatMessageInfo.optional(),
    members: z
      .array(microsoft_graph_conversationMember)
      .describe('A collection of all the members in the chat. Nullable.')
      .optional(),
    messages: z
      .array(microsoft_graph_chatMessage)
      .describe('A collection of all the messages in the chat. Nullable.')
      .optional(),
    permissionGrants: z
      .array(microsoft_graph_resourceSpecificPermissionGrant)
      .describe('A collection of permissions granted to apps for the chat.')
      .optional(),
    pinnedMessages: z
      .array(microsoft_graph_pinnedChatMessageInfo)
      .describe('A collection of all the pinned messages in the chat. Nullable.')
      .optional(),
    tabs: z
      .array(microsoft_graph_teamsTab)
      .describe('A collection of all the tabs in the chat. Nullable.')
      .optional(),
    targetedMessages: z.array(microsoft_graph_targetedChatMessage).optional(),
  })
  .passthrough();
const microsoft_graph_ODataErrors_ErrorDetails = z
  .object({ code: z.string(), message: z.string(), target: z.string().nullish() })
  .passthrough();
const microsoft_graph_ODataErrors_InnerError = z
  .object({
    'request-id': z.string().describe('Request Id as tracked internally by the service').nullish(),
    'client-request-id': z
      .string()
      .describe('Client request Id as sent by the client application.')
      .nullish(),
    date: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date when the error occured.')
      .nullish(),
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
const microsoft_graph_conversationMemberCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_conversationMember),
  })
  .partial()
  .passthrough();
const microsoft_graph_chatMessageCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_chatMessage),
  })
  .partial()
  .passthrough();
const microsoft_graph_chatMessageHostedContentCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_chatMessageHostedContent),
  })
  .partial()
  .passthrough();
const microsoft_graph_pinnedChatMessageInfoCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_pinnedChatMessageInfo),
  })
  .partial()
  .passthrough();
const get_presences_by_user_id_Body = z
  .object({ ids: z.array(z.string()) })
  .partial()
  .passthrough();
const BaseCollectionPaginationCountResponse = z
  .object({ '@odata.count': z.number().int().nullable(), '@odata.nextLink': z.string().nullable() })
  .partial()
  .passthrough();
const microsoft_graph_outOfOfficeSettings = z
  .object({
    isOutOfOffice: z
      .boolean()
      .describe(
        "If true, either of the following is met:The current time falls within the out-of-office window configured in Outlook or Teams.An event marked as 'Show as Out of Office' appears on the user's calendar.Otherwise, false."
      )
      .nullish(),
    message: z
      .string()
      .describe(
        'The out-of-office message configured by the user in the Outlook client (Automatic replies) or the Teams client (Schedule out of office).'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_dateTimeTimeZone = z
  .object({
    dateTime: z
      .string()
      .describe(
        'A single point of time in a combined date and time representation ({date}T{time}; for example, 2017-08-29T04:00:00.0000000).'
      )
      .optional(),
    timeZone: z
      .string()
      .describe(
        "Represents a time zone, for example, 'Pacific Standard Time'. See below for more possible values."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_presenceStatusMessage = z
  .object({
    expiryDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    message: microsoft_graph_itemBody.optional(),
    publishedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Time in which the status message was published.Read-only.publishedDateTime isn't available when you request the presence of another user."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workLocationSource = z.enum([
  'none',
  'manual',
  'scheduled',
  'automatic',
  'unknownFutureValue',
]);
const microsoft_graph_workLocationType = z.enum([
  'unspecified',
  'office',
  'remote',
  'timeOff',
  'unknownFutureValue',
]);
const microsoft_graph_userWorkLocation = z
  .object({
    placeId: z.string().describe('Identifier of the place, if applicable.').nullish(),
    source: microsoft_graph_workLocationSource.optional(),
    workLocationType: microsoft_graph_workLocationType.optional(),
  })
  .passthrough();
const microsoft_graph_presence = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    activity: z
      .string()
      .describe(
        "The supplemental information to a user's availability. Possible values are available, away, beRightBack, busy, doNotDisturb, offline, outOfOffice, presenceUnknown."
      )
      .nullish(),
    availability: z
      .string()
      .describe(
        'The base presence information for a user. Possible values are available, away, beRightBack, busy, doNotDisturb, focusing, inACall, inAMeeting, offline, presenting, presenceUnknown.'
      )
      .nullish(),
    outOfOfficeSettings: microsoft_graph_outOfOfficeSettings.optional(),
    sequenceNumber: z
      .string()
      .describe(
        'The lexicographically sortable String stamp that represents the version of a presence object.'
      )
      .nullish(),
    statusMessage: microsoft_graph_presenceStatusMessage.optional(),
    workLocation: microsoft_graph_userWorkLocation.optional(),
  })
  .passthrough();
const microsoft_graph_geoCoordinates = z
  .object({
    altitude: z
      .number()
      .describe(
        'Optional. The altitude (height), in feet,  above sea level for the item. Read-only. [Simplified from 3 options]'
      )
      .nullish(),
    latitude: z
      .number()
      .describe(
        'Optional. The latitude, in decimal, for the item. Read-only. [Simplified from 3 options]'
      )
      .nullish(),
    longitude: z
      .number()
      .describe(
        'Optional. The longitude, in decimal, for the item. Read-only. [Simplified from 3 options]'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_sharepointIds = z
  .object({
    listId: z
      .string()
      .describe("The unique identifier (guid) for the item's list in SharePoint.")
      .nullish(),
    listItemId: z
      .string()
      .describe('An integer identifier for the item within the containing list.')
      .nullish(),
    listItemUniqueId: z
      .string()
      .describe(
        'The unique identifier (guid) for the item within OneDrive for Business or a SharePoint site.'
      )
      .nullish(),
    siteId: z
      .string()
      .describe("The unique identifier (guid) for the item's site collection (SPSite).")
      .nullish(),
    siteUrl: z
      .string()
      .describe('The SharePoint URL for the site that contains the item.')
      .nullish(),
    tenantId: z.string().describe('The unique identifier (guid) for the tenancy.').nullish(),
    webId: z
      .string()
      .describe("The unique identifier (guid) for the item's site (SPWeb).")
      .nullish(),
  })
  .passthrough();
const microsoft_graph_itemReference = z
  .object({
    driveId: z
      .string()
      .describe(
        'Unique identifier of the drive instance that contains the driveItem. Only returned if the item is located in a drive. Read-only.'
      )
      .nullish(),
    driveType: z
      .string()
      .describe(
        'Identifies the type of drive. Only returned if the item is located in a drive. See drive resource for values.'
      )
      .nullish(),
    id: z
      .string()
      .describe(
        'Unique identifier of the driveItem in the drive or a listItem in a list. Read-only.'
      )
      .nullish(),
    name: z.string().describe('The name of the item being referenced. Read-only.').nullish(),
    path: z
      .string()
      .describe('Percent-encoded path that can be used to navigate to the item. Read-only.')
      .nullish(),
    shareId: z
      .string()
      .describe(
        'A unique identifier for a shared resource that can be accessed via the Shares API.'
      )
      .nullish(),
    sharepointIds: microsoft_graph_sharepointIds.optional(),
    siteId: z
      .string()
      .describe(
        'For OneDrive for Business and SharePoint, this property represents the ID of the site that contains the parent document library of the driveItem resource or the parent list of the listItem resource. The value is the same as the id property of that site resource. It is an opaque string that consists of three identifiers of the site. For OneDrive, this property is not populated.'
      )
      .nullish(),
  })
  .passthrough();
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
      )
      .optional(),
    skuId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .describe(
        'The unique identifier for the SKU. Corresponds to the skuId from subscribedSkus or companySubscription.'
      )
      .nullish(),
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
      .describe(
        'The date and time at which the plan was assigned. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    capabilityStatus: z
      .string()
      .describe(
        'Condition of the capability assignment. The possible values are Enabled, Warning, Suspended, Deleted, LockedOut. See a detailed description of each value.'
      )
      .nullish(),
    service: z.string().describe('The name of the service; for example, exchange.').nullish(),
    servicePlanId: z
      .string()
      .regex(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)
      .uuid()
      .describe(
        'A GUID that identifies the service plan. For a complete list of GUIDs and their equivalent friendly service names, see Product names and service plan identifiers for licensing.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_authorizationInfo = z
  .object({ certificateUserIds: z.array(z.string().nullable()).optional() })
  .passthrough();
const microsoft_graph_customSecurityAttributeValue = z.object({}).passthrough();
const microsoft_graph_user = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z
      .string()
      .describe(
        "The name displayed in the address book for the user. This value is usually the combination of the user's first name, middle initial, and family name. This property is required when a user is created and it can't be cleared during updates. Maximum length is 256 characters. Returned by default. Supports $filter (eq, ne, not , ge, le, in, startsWith, and eq on null values), $orderby, and $search."
      )
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "The date and time the user was created, in ISO 8601 format and UTC. The value can't be modified and is automatically populated when the entity is created. Nullable. For on-premises users, the value represents when they were first created in Microsoft Entra ID. Property is null for some users created before June 2018 and on-premises users that were synced to Microsoft Entra ID before June 2018. Read-only. Requires $select to retrieve. Supports $filter (eq, ne, not , ge, le, in)."
      )
      .nullish(),
    state: z
      .string()
      .describe(
        "The state or province in the user's address. Maximum length is 128 characters. Requires $select to retrieve. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
      )
      .nullish(),
    userPrincipalName: z
      .string()
      .describe(
        "The user principal name (UPN) of the user. The UPN is an Internet-style sign-in name for the user based on the Internet standard RFC 822. By convention, this value should map to the user's email name. The general format is alias@domain, where the domain must be present in the tenant's collection of verified domains. This property is required when a user is created. The verified domains for the tenant can be accessed from the verifiedDomains property of organization.NOTE: This property can't contain accent characters. Only the following characters are allowed A - Z, a - z, 0 - 9, ' . - _ ! # ^ ~. For the complete list of allowed characters, see username policies. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, endsWith) and $orderby."
      )
      .nullish(),
    deletedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Date and time when this object was deleted. Always null when the object hasn't been deleted."
      )
      .nullish(),
    aboutMe: z
      .string()
      .describe(
        'A freeform text entry field for the user to describe themselves. Requires $select to retrieve.'
      )
      .nullish(),
    accountEnabled: z
      .boolean()
      .describe(
        'true if the account is enabled; otherwise, false. This property is required when a user is created. Requires $select to retrieve. Supports $filter (eq, ne, not, and in).'
      )
      .nullish(),
    ageGroup: z
      .string()
      .describe(
        'Sets the age group of the user. Allowed values: null, Minor, NotAdult, and Adult. For more information, see legal age group property definitions. Requires $select to retrieve. Supports $filter (eq, ne, not, and in).'
      )
      .nullish(),
    assignedLicenses: z
      .array(microsoft_graph_assignedLicense)
      .describe(
        "The licenses that are assigned to the user, including inherited (group-based) licenses. This property doesn't differentiate between directly assigned and inherited licenses. Use the licenseAssignmentStates property to identify the directly assigned and inherited licenses. Not nullable. Requires $select to retrieve. Supports $filter (eq, not, /$count eq 0, /$count ne 0)."
      )
      .optional(),
    assignedPlans: z
      .array(microsoft_graph_assignedPlan)
      .describe(
        'The plans that are assigned to the user. Read-only. Not nullable. Requires $select to retrieve. Supports $filter (eq and not).'
      )
      .optional(),
    authorizationInfo: microsoft_graph_authorizationInfo.optional(),
    birthday: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The birthday of the user. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014, is 2014-01-01T00:00:00Z. Requires $select to retrieve.'
      )
      .optional(),
    businessPhones: z
      .array(z.string())
      .describe(
        "The telephone numbers for the user. NOTE: Although it's a string collection, only one number can be set for this property. Read-only for users synced from the on-premises directory. Returned by default. Supports $filter (eq, not, ge, le, startsWith)."
      )
      .optional(),
    city: z
      .string()
      .describe(
        'The city where the user is located. Maximum length is 128 characters. Requires $select to retrieve. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
      )
      .nullish(),
    companyName: z
      .string()
      .describe(
        'The name of the company that the user is associated with. This property can be useful for describing the company that a guest comes from. The maximum length is 64 characters.Requires $select to retrieve. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
      )
      .nullish(),
    consentProvidedForMinor: z
      .string()
      .describe(
        'Sets whether consent was obtained for minors. Allowed values: null, Granted, Denied, and NotRequired. For more information, see legal age group property definitions. Requires $select to retrieve. Supports $filter (eq, ne, not, and in).'
      )
      .nullish(),
    country: z
      .string()
      .describe(
        'The country or region where the user is located; for example, US or UK. Maximum length is 128 characters. Requires $select to retrieve. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values).'
      )
      .nullish(),
    creationType: z
      .string()
      .describe(
        'Indicates whether the user account was created through one of the following methods:  As a regular school or work account (null). As an external account (Invitation). As a local account for an Azure Active Directory B2C tenant (LocalAccount). Through self-service sign-up by an internal user using email verification (EmailVerified). Through self-service sign-up by a guest signing up through a link that is part of a user flow (SelfServiceSignUp). Read-only.Requires $select to retrieve. Supports $filter (eq, ne, not, in).'
      )
      .nullish(),
    customSecurityAttributes: microsoft_graph_customSecurityAttributeValue.optional(),
    department: z
      .string()
      .describe(
        'The name of the department in which the user works. Maximum length is 64 characters. Requires $select to retrieve. Supports $filter (eq, ne, not , ge, le, in, and eq on null values).'
      )
      .nullish(),
    deviceEnrollmentLimit: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The limit on the maximum number of devices that the user is permitted to enroll. Allowed values are 5 or 1000.'
      )
      .optional(),
    employeeHireDate: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time when the user was hired or will start work in a future hire. Requires $select to retrieve. Supports $filter (eq, ne, not , ge, le, in).'
      )
      .nullish(),
    employeeId: z
      .string()
      .describe(
        'The employee identifier assigned to the user by the organization. The maximum length is 16 characters. Requires $select to retrieve. Supports $filter (eq, ne, not , ge, le, in, startsWith, and eq on null values).'
      )
      .nullish(),
    employeeLeaveDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time when the user left or will leave the organization. To read this property, the calling app must be assigned the User-LifeCycleInfo.Read.All permission. To write this property, the calling app must be assigned the User.Read.All and User-LifeCycleInfo.ReadWrite.All permissions. To read this property in delegated scenarios, the admin needs at least one of the following Microsoft Entra roles: Lifecycle Workflows Administrator (least privilege), Global Reader. To write this property in delegated scenarios, the admin needs the Global Administrator role. Supports $filter (eq, ne, not , ge, le, in). For more information, see Configure the employeeLeaveDateTime property for a user.'
      )
      .nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_audio = z
  .object({
    album: z.string().describe('The title of the album for this audio file.').nullish(),
    albumArtist: z.string().describe('The artist named on the album for the audio file.').nullish(),
    artist: z.string().describe('The performing artist for the audio file.').nullish(),
    bitrate: z.number().describe('Bitrate expressed in kbps.').nullish(),
    composers: z.string().describe('The name of the composer of the audio file.').nullish(),
    copyright: z.string().describe('Copyright information for the audio file.').nullish(),
    disc: z
      .number()
      .gte(-32768)
      .lte(32767)
      .describe('The number of the disc this audio file came from.')
      .nullish(),
    discCount: z
      .number()
      .gte(-32768)
      .lte(32767)
      .describe('The total number of discs in this album.')
      .nullish(),
    duration: z
      .number()
      .describe('Duration of the audio file, expressed in milliseconds')
      .nullish(),
    genre: z.string().describe('The genre of this audio file.').nullish(),
    hasDrm: z
      .boolean()
      .describe('Indicates if the file is protected with digital rights management.')
      .nullish(),
    isVariableBitrate: z
      .boolean()
      .describe('Indicates if the file is encoded with a variable bitrate.')
      .nullish(),
    title: z.string().describe('The title of the audio file.').nullish(),
    track: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of the track on the original disc for this audio file.')
      .nullish(),
    trackCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The total number of tracks on the original disc for this audio file.')
      .nullish(),
    year: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The year the audio file was recorded.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_album = z
  .object({
    coverImageItemId: z
      .string()
      .describe('Unique identifier of the driveItem that is the cover of the album.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_bundle = z
  .object({
    album: microsoft_graph_album.optional(),
    childCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of children contained immediately within this container.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_deleted = z
  .object({ state: z.string().describe('Represents the state of the deleted item.').nullish() })
  .passthrough();
const microsoft_graph_hashes = z
  .object({
    crc32Hash: z
      .string()
      .describe('The CRC32 value of the file (if available). Read-only.')
      .nullish(),
    quickXorHash: z
      .string()
      .describe(
        'A proprietary hash of the file that can be used to determine if the contents of the file change (if available). Read-only.'
      )
      .nullish(),
    sha1Hash: z
      .string()
      .describe('SHA1 hash for the contents of the file (if available). Read-only.')
      .nullish(),
    sha256Hash: z.string().describe("This property isn't supported. Don't use.").nullish(),
  })
  .passthrough();
const microsoft_graph_file = z
  .object({
    hashes: microsoft_graph_hashes.optional(),
    mimeType: z
      .string()
      .describe(
        'The MIME type for the file. This is determined by logic on the server and might not be the value provided when the file was uploaded. Read-only.'
      )
      .nullish(),
    processingMetadata: z.boolean().nullish(),
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
      .describe('The UTC date and time the file was created on a client.')
      .nullish(),
    lastAccessedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The UTC date and time the file was last accessed. Available for the recent file list only.'
      )
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The UTC date and time the file was last modified on a client.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_folderView = z
  .object({
    sortBy: z.string().describe('The method by which the folder should be sorted.').nullish(),
    sortOrder: z
      .string()
      .describe(
        'If true, indicates that items should be sorted in descending order. Otherwise, items should be sorted ascending.'
      )
      .nullish(),
    viewType: z
      .string()
      .describe('The type of view that should be used to represent the folder.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_folder = z
  .object({
    childCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of children contained immediately within this container.')
      .nullish(),
    view: microsoft_graph_folderView.optional(),
  })
  .passthrough();
const microsoft_graph_image = z
  .object({
    height: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Optional. Height of the image, in pixels. Read-only.')
      .nullish(),
    width: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Optional. Width of the image, in pixels. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_malware = z
  .object({
    description: z.string().describe('Contains the virus details for the malware facet.').nullish(),
  })
  .passthrough();
const microsoft_graph_package = z
  .object({
    type: z
      .string()
      .describe(
        'A string indicating the type of package. While oneNote is the only currently defined value, you should expect other package types to be returned and handle them accordingly.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_pendingContentUpdate = z
  .object({
    queuedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the pending binary operation was queued in UTC time. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_pendingOperations = z
  .object({ pendingContentUpdate: microsoft_graph_pendingContentUpdate.optional() })
  .passthrough();
const microsoft_graph_driveItem = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    name: z.string().describe('The name of the item. Read-write.').nullish(),
    description: z
      .string()
      .describe('Provides a user-visible description of the item. Optional.')
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time of item creation. Read-only.')
      .optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the item was last modified. Read-only.')
      .optional(),
    content: z.string().describe('The content stream, if the item represents a file.').nullish(),
    location: microsoft_graph_geoCoordinates.optional(),
    createdBy: microsoft_graph_identitySet.optional(),
    eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
    lastModifiedBy: microsoft_graph_identitySet.optional(),
    parentReference: microsoft_graph_itemReference.optional(),
    webUrl: z
      .string()
      .describe(
        'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
      )
      .nullish(),
    createdByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
    lastModifiedByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
    audio: microsoft_graph_audio.optional(),
    bundle: microsoft_graph_bundle.optional(),
    cTag: z
      .string()
      .describe(
        "An eTag for the content of the item. This eTag isn't changed if only the metadata is changed. Note This property isn't returned if the item is a folder. Read-only."
      )
      .nullish(),
    deleted: microsoft_graph_deleted.optional(),
    file: microsoft_graph_file.optional(),
    fileSystemInfo: microsoft_graph_fileSystemInfo.optional(),
    folder: microsoft_graph_folder.optional(),
    image: microsoft_graph_image.optional(),
    malware: microsoft_graph_malware.optional(),
    package: microsoft_graph_package.optional(),
    pendingOperations: microsoft_graph_pendingOperations.optional(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_driveItemCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_driveItem),
  })
  .partial()
  .passthrough();
const copy_drive_item_Body = z
  .object({
    name: z.string().nullable(),
    parentReference: z.union([microsoft_graph_itemReference, z.object({}).partial().passthrough()]),
    childrenOnly: z.boolean().nullable().default(false),
    includeAllVersionHistory: z.boolean().nullable().default(false),
  })
  .partial()
  .passthrough();
const create_drive_item_share_link_Body = z
  .object({
    type: z.string().nullable(),
    scope: z.string().nullable(),
    expirationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullable(),
    password: z.string().nullable(),
    message: z.string().nullable(),
    recipients: z.array(z.object({}).partial().passthrough()),
    retainInheritedPermissions: z.boolean().nullable().default(false),
    sendNotification: z.boolean().nullable().default(false),
  })
  .partial()
  .passthrough();
const microsoft_graph_sharePointGroupIdentity = z
  .object({
    displayName: z
      .string()
      .describe(
        "The display name of the identity.For drive items, the display name might not always be available or up to date. For example, if a user changes their display name the API might show the new value in a future response, but the items associated with the user don't show up as changed when using delta."
      )
      .nullish(),
    id: z
      .string()
      .describe(
        "Unique identifier for the identity or actor. For example, in the access reviews decisions API, this property might record the id of the principal, that is, the group, user, or application that's subject to review."
      )
      .nullish(),
    principalId: z
      .string()
      .describe('The principal ID of the SharePoint group in the tenant. Read-only.')
      .nullish(),
    title: z.string().describe('The title of the SharePoint group. Read-only.').nullish(),
  })
  .passthrough();
const microsoft_graph_sharePointIdentity = z
  .object({
    displayName: z
      .string()
      .describe(
        "The display name of the identity.For drive items, the display name might not always be available or up to date. For example, if a user changes their display name the API might show the new value in a future response, but the items associated with the user don't show up as changed when using delta."
      )
      .nullish(),
    id: z
      .string()
      .describe(
        "Unique identifier for the identity or actor. For example, in the access reviews decisions API, this property might record the id of the principal, that is, the group, user, or application that's subject to review."
      )
      .nullish(),
    loginName: z.string().describe('The sign in name of the SharePoint identity.').nullish(),
  })
  .passthrough();
const microsoft_graph_sharePointIdentitySet = z
  .object({
    application: microsoft_graph_identity.optional(),
    device: microsoft_graph_identity.optional(),
    user: microsoft_graph_identity.optional(),
    group: microsoft_graph_identity.optional(),
    sharePointGroup: microsoft_graph_sharePointGroupIdentity.optional(),
    siteGroup: microsoft_graph_sharePointIdentity.optional(),
    siteUser: microsoft_graph_sharePointIdentity.optional(),
  })
  .passthrough();
const microsoft_graph_sharingInvitation = z
  .object({
    email: z
      .string()
      .describe(
        'The email address provided for the recipient of the sharing invitation. Read-only.'
      )
      .nullish(),
    invitedBy: microsoft_graph_identitySet.optional(),
    redeemedBy: z.string().nullish(),
    signInRequired: z
      .boolean()
      .describe(
        'If true the recipient of the invitation needs to sign in in order to access the shared item. Read-only.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_sharingLink = z
  .object({
    application: microsoft_graph_identity.optional(),
    preventsDownload: z
      .boolean()
      .describe(
        'If true then the user can only use this link to view the item on the web, and cannot use it to download the contents of the item. Only for OneDrive for Business and SharePoint.'
      )
      .nullish(),
    scope: z
      .string()
      .describe(
        'The scope of the link represented by this permission. Value anonymous indicates the link is usable by anyone, organization indicates the link is only usable for users signed into the same tenant.'
      )
      .nullish(),
    type: z.string().describe('The type of the link created.').nullish(),
    webHtml: z
      .string()
      .describe(
        'For embed links, this property contains the HTML code for an <iframe> element that will embed the item in a webpage.'
      )
      .nullish(),
    webUrl: z
      .string()
      .describe('A URL that opens the item in the browser on the OneDrive website.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_permission = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    expirationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "A format of yyyy-MM-ddTHH:mm:ssZ of DateTimeOffset indicates the expiration time of the permission. DateTime.MinValue indicates there's no expiration set for this permission. Optional."
      )
      .nullish(),
    grantedTo: microsoft_graph_identitySet.optional(),
    grantedToIdentities: z
      .array(microsoft_graph_identitySet)
      .describe(
        'For type permissions, the details of the users to whom permission was granted. Read-only.'
      )
      .optional(),
    grantedToIdentitiesV2: z
      .array(microsoft_graph_sharePointIdentitySet)
      .describe(
        'For link type permissions, the details of the users to whom permission was granted. Read-only.'
      )
      .optional(),
    grantedToV2: microsoft_graph_sharePointIdentitySet.optional(),
    hasPassword: z
      .boolean()
      .describe(
        'Indicates whether the password is set for this permission. This property only appears in the response. Optional. Read-only. For OneDrive Personal only..'
      )
      .nullish(),
    inheritedFrom: microsoft_graph_itemReference.optional(),
    invitation: microsoft_graph_sharingInvitation.optional(),
    link: microsoft_graph_sharingLink.optional(),
    roles: z
      .array(z.string().nullable())
      .describe(
        'The type of permission, for example, read. See below for the full list of roles. Read-only.'
      )
      .optional(),
    shareId: z
      .string()
      .describe(
        'A unique token that can be used to access this shared item via the shares API. Read-only.'
      )
      .nullish(),
  })
  .passthrough();
const create_upload_session_Body = z
  .object({ item: z.object({}).partial().passthrough() })
  .partial()
  .passthrough();
const microsoft_graph_uploadSession = z
  .object({
    expirationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time in UTC that the upload session expires. The complete file must be uploaded before this expiration time is reached. Each fragment uploaded during the session extends the expiration time.'
      )
      .nullish(),
    nextExpectedRanges: z
      .array(z.string().nullable())
      .describe(
        "A collection of byte ranges that the server is missing for the file. These ranges are zero indexed and of the format 'start-end' (for example '0-26' to indicate the first 27 bytes of the file). When uploading files as Outlook attachments, instead of a collection of ranges, this property always indicates a single value '{start}', the location in the file where the next upload should begin."
      )
      .optional(),
    uploadUrl: z
      .string()
      .describe('The URL endpoint that accepts PUT requests for byte ranges of the file.')
      .nullish(),
  })
  .passthrough();
const BaseDeltaFunctionResponse = z
  .object({ '@odata.nextLink': z.string().nullable(), '@odata.deltaLink': z.string().nullable() })
  .partial()
  .passthrough();
const microsoft_graph_sensitivityLabelAssignmentMethod = z.enum([
  'standard',
  'privileged',
  'auto',
  'unknownFutureValue',
]);
const microsoft_graph_sensitivityLabelAssignment = z
  .object({
    assignmentMethod: microsoft_graph_sensitivityLabelAssignmentMethod.optional(),
    sensitivityLabelId: z
      .string()
      .describe('The unique identifier for the sensitivity label assigned to the file.')
      .optional(),
    tenantId: z
      .string()
      .describe(
        'The unique identifier for the tenant that hosts the file when this label is applied.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_extractSensitivityLabelsResult = z
  .object({
    labels: z
      .array(microsoft_graph_sensitivityLabelAssignment)
      .describe('List of sensitivity labels assigned to a file.')
      .optional(),
  })
  .passthrough();
const share_drive_item_Body = z
  .object({
    requireSignIn: z.boolean().nullable().default(false),
    roles: z.array(z.string().nullable()),
    sendInvitation: z.boolean().nullable().default(false),
    message: z.string().nullable(),
    recipients: z.array(z.object({}).partial().passthrough()),
    retainInheritedPermissions: z.boolean().nullable().default(false),
    expirationDateTime: z.string().nullable(),
    password: z.string().nullable(),
  })
  .partial()
  .passthrough();
const ReferenceNumeric = z.enum(['-INF', 'INF', 'NaN']);
const create_drive_item_preview_Body = z
  .object({
    page: z.string().nullable(),
    zoom: z.union([z.number(), z.string(), ReferenceNumeric]),
  })
  .partial()
  .passthrough();
const microsoft_graph_itemPreviewInfo = z
  .object({
    getUrl: z.string().nullish(),
    postParameters: z.string().nullish(),
    postUrl: z.string().nullish(),
  })
  .passthrough();
const microsoft_graph_permissionCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_permission),
  })
  .partial()
  .passthrough();
const microsoft_graph_thumbnail = z
  .object({
    content: z.string().describe('The content stream for the thumbnail.').nullish(),
    height: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The height of the thumbnail, in pixels.')
      .nullish(),
    sourceItemId: z
      .string()
      .describe(
        'The unique identifier of the item that provided the thumbnail. This is only available when a folder thumbnail is requested.'
      )
      .nullish(),
    url: z.string().describe('The URL used to fetch the thumbnail content.').nullish(),
    width: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The width of the thumbnail, in pixels.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_thumbnailSet = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    large: microsoft_graph_thumbnail.optional(),
    medium: microsoft_graph_thumbnail.optional(),
    small: microsoft_graph_thumbnail.optional(),
    source: microsoft_graph_thumbnail.optional(),
  })
  .passthrough();
const microsoft_graph_thumbnailSetCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_thumbnailSet),
  })
  .partial()
  .passthrough();
const microsoft_graph_publicationFacet = z
  .object({
    checkedOutBy: microsoft_graph_identitySet.optional(),
    level: z
      .string()
      .describe(
        'The state of publication for this document. Either published or checkout. Read-only.'
      )
      .nullish(),
    versionId: z
      .string()
      .describe(
        'The unique identifier for the version that is visible to the current caller. Read-only.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_driveItemVersion = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    lastModifiedBy: microsoft_graph_identitySet.optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the version was last modified. Read-only.')
      .nullish(),
    publication: microsoft_graph_publicationFacet.optional(),
    content: z.string().describe('The content stream for this version of the item.').nullish(),
    size: z
      .number()
      .describe('Indicates the size of the content stream for this version of the item.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_driveItemVersionCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_driveItemVersion),
  })
  .partial()
  .passthrough();
const microsoft_graph_workbookIcon = z
  .object({
    index: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The index of the icon in the given set.')
      .optional(),
    set: z
      .string()
      .describe(
        'The set that the icon is part of. The possible values are: Invalid, ThreeArrows, ThreeArrowsGray, ThreeFlags, ThreeTrafficLights1, ThreeTrafficLights2, ThreeSigns, ThreeSymbols, ThreeSymbols2, FourArrows, FourArrowsGray, FourRedToBlack, FourRating, FourTrafficLights, FiveArrows, FiveArrowsGray, FiveRating, FiveQuarters, ThreeStars, ThreeTriangles, FiveBoxes.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_workbookFilterCriteria = z
  .object({
    color: z.string().describe('The color applied to the cell.').nullish(),
    criterion1: z.string().describe('A custom criterion.').nullish(),
    criterion2: z.string().describe('A custom criterion.').nullish(),
    dynamicCriteria: z
      .string()
      .describe('A dynamic formula specified in a custom filter.')
      .optional(),
    filterOn: z.string().describe('Indicates whether a filter is applied to a column.').optional(),
    icon: microsoft_graph_workbookIcon.optional(),
    operator: z
      .string()
      .describe('An operator in a cell; for example, =, >, <, <=, or <>.')
      .optional(),
    values: z.unknown().describe('The values that appear in the cell.').optional(),
  })
  .passthrough();
const microsoft_graph_workbookFilter = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    criteria: microsoft_graph_workbookFilterCriteria.optional(),
  })
  .passthrough();
const microsoft_graph_workbookTableColumn = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    index: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The index of the column within the columns collection of the table. Zero-indexed. Read-only.'
      )
      .optional(),
    name: z.string().describe('The name of the table column.').nullish(),
    values: z
      .unknown()
      .describe(
        'TRepresents the raw values of the specified range. The data returned could be of type string, number, or a Boolean. Cell that contain an error will return the error string.'
      )
      .optional(),
    filter: microsoft_graph_workbookFilter.optional(),
  })
  .passthrough();
const microsoft_graph_workbookTableRow = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    index: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The index of the row within the rows collection of the table. Zero-based. Read-only.'
      )
      .optional(),
    values: z
      .unknown()
      .describe(
        'The raw values of the specified range. The data returned could be of type string, number, or a Boolean. Any cell that contain an error will return the error string.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_workbookSortField = z
  .object({
    ascending: z
      .boolean()
      .describe('Represents whether the sorting is done in an ascending fashion.')
      .optional(),
    color: z
      .string()
      .describe(
        'Represents the color that is the target of the condition if the sorting is on font or cell color.'
      )
      .nullish(),
    dataOption: z
      .string()
      .describe(
        'Represents additional sorting options for this field. The possible values are: Normal, TextAsNumber.'
      )
      .optional(),
    icon: microsoft_graph_workbookIcon.optional(),
    key: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'Represents the column (or row, depending on the sort orientation) that the condition is on. Represented as an offset from the first column (or row).'
      )
      .optional(),
    sortOn: z
      .string()
      .describe(
        'Represents the type of sorting of this condition. The possible values are: Value, CellColor, FontColor, Icon.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_workbookTableSort = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    fields: z
      .array(microsoft_graph_workbookSortField)
      .describe('The list of the current conditions last used to sort the table. Read-only.')
      .optional(),
    matchCase: z
      .boolean()
      .describe('Indicates whether the casing impacted the last sort of the table. Read-only.')
      .optional(),
    method: z
      .string()
      .describe(
        'The Chinese character ordering method last used to sort the table. The possible values are: PinYin, StrokeCount. Read-only.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartFont = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    bold: z.boolean().describe('Indicates whether the fond is bold.').nullish(),
    color: z
      .string()
      .describe(
        'The HTML color code representation of the text color. For example #FF0000 represents Red.'
      )
      .nullish(),
    italic: z.boolean().describe('Indicates whether the fond is italic.').nullish(),
    name: z.string().describe("The font name. For example 'Calibri'.").nullish(),
    size: z
      .number()
      .describe('The size of the font. For example,  11. [Simplified from 3 options]')
      .nullish(),
    underline: z
      .string()
      .describe(
        'The type of underlining applied to the font. The possible values are: None, Single.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workbookChartLineFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    color: z
      .string()
      .describe('The HTML color code that represents the color of lines in the chart.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workbookChartAxisFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    font: microsoft_graph_workbookChartFont.optional(),
    line: microsoft_graph_workbookChartLineFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartGridlinesFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    line: microsoft_graph_workbookChartLineFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartGridlines = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    visible: z.boolean().describe('Indicates whether the axis gridlines are visible.').optional(),
    format: microsoft_graph_workbookChartGridlinesFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartAxisTitleFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    font: microsoft_graph_workbookChartFont.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartAxisTitle = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    text: z.string().describe('Represents the axis title.').nullish(),
    visible: z
      .boolean()
      .describe('A Boolean that specifies the visibility of an axis title.')
      .optional(),
    format: microsoft_graph_workbookChartAxisTitleFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartAxis = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    majorUnit: z
      .unknown()
      .describe(
        'Represents the interval between two major tick marks. Can be set to a numeric value or an empty string.  The returned value is always a number.'
      )
      .optional(),
    maximum: z
      .unknown()
      .describe(
        'Represents the maximum value on the value axis.  Can be set to a numeric value or an empty string (for automatic axis values).  The returned value is always a number.'
      )
      .optional(),
    minimum: z
      .unknown()
      .describe(
        'Represents the minimum value on the value axis. Can be set to a numeric value or an empty string (for automatic axis values).  The returned value is always a number.'
      )
      .optional(),
    minorUnit: z
      .unknown()
      .describe(
        "Represents the interval between two minor tick marks. 'Can be set to a numeric value or an empty string (for automatic axis values). The returned value is always a number."
      )
      .optional(),
    format: microsoft_graph_workbookChartAxisFormat.optional(),
    majorGridlines: microsoft_graph_workbookChartGridlines.optional(),
    minorGridlines: microsoft_graph_workbookChartGridlines.optional(),
    title: microsoft_graph_workbookChartAxisTitle.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartAxes = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    categoryAxis: microsoft_graph_workbookChartAxis.optional(),
    seriesAxis: microsoft_graph_workbookChartAxis.optional(),
    valueAxis: microsoft_graph_workbookChartAxis.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartFill = z
  .object({ id: z.string().describe('The unique identifier for an entity. Read-only.').optional() })
  .passthrough();
const microsoft_graph_workbookChartDataLabelFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    fill: microsoft_graph_workbookChartFill.optional(),
    font: microsoft_graph_workbookChartFont.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartDataLabels = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    position: z
      .string()
      .describe(
        'DataLabelPosition value that represents the position of the data label. The possible values are: None, Center, InsideEnd, InsideBase, OutsideEnd, Left, Right, Top, Bottom, BestFit, Callout.'
      )
      .nullish(),
    separator: z
      .string()
      .describe('String that represents the separator used for the data labels on a chart.')
      .nullish(),
    showBubbleSize: z
      .boolean()
      .describe('Boolean value that represents whether the data label bubble size is visible.')
      .nullish(),
    showCategoryName: z
      .boolean()
      .describe('Boolean value that represents whether the data label category name is visible.')
      .nullish(),
    showLegendKey: z
      .boolean()
      .describe('Boolean value that represents whether the data label legend key is visible.')
      .nullish(),
    showPercentage: z
      .boolean()
      .describe('Boolean value that represents whether the data label percentage is visible.')
      .nullish(),
    showSeriesName: z
      .boolean()
      .describe('Boolean value that represents whether the data label series name is visible.')
      .nullish(),
    showValue: z
      .boolean()
      .describe('Boolean value that represents whether the data label value is visible.')
      .nullish(),
    format: microsoft_graph_workbookChartDataLabelFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartAreaFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    fill: microsoft_graph_workbookChartFill.optional(),
    font: microsoft_graph_workbookChartFont.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartLegendFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    fill: microsoft_graph_workbookChartFill.optional(),
    font: microsoft_graph_workbookChartFont.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartLegend = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    overlay: z
      .boolean()
      .describe(
        'Indicates whether the chart legend should overlap with the main body of the chart.'
      )
      .nullish(),
    position: z
      .string()
      .describe(
        'Represents the position of the legend on the chart. The possible values are: Top, Bottom, Left, Right, Corner, Custom.'
      )
      .nullish(),
    visible: z.boolean().describe('Indicates whether the chart legend is visible.').optional(),
    format: microsoft_graph_workbookChartLegendFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartSeriesFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    fill: microsoft_graph_workbookChartFill.optional(),
    line: microsoft_graph_workbookChartLineFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartPointFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    fill: microsoft_graph_workbookChartFill.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartPoint = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    value: z.unknown().describe('The value of a chart point. Read-only.').optional(),
    format: microsoft_graph_workbookChartPointFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartSeries = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    name: z.string().describe('The name of a series in a chart.').nullish(),
    format: microsoft_graph_workbookChartSeriesFormat.optional(),
    points: z
      .array(microsoft_graph_workbookChartPoint)
      .describe('A collection of all points in the series. Read-only.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartTitleFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    fill: microsoft_graph_workbookChartFill.optional(),
    font: microsoft_graph_workbookChartFont.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChartTitle = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    overlay: z
      .boolean()
      .describe('Indicates whether the chart title will overlay the chart or not.')
      .nullish(),
    text: z.string().describe('The title text of the chart.').nullish(),
    visible: z.boolean().describe('Indicates whether the chart title is visible.').optional(),
    format: microsoft_graph_workbookChartTitleFormat.optional(),
  })
  .passthrough();
const microsoft_graph_workbookChart: z.ZodType<microsoft_graph_workbookChart> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      height: z
        .number()
        .describe(
          'Represents the height, in points, of the chart object. [Simplified from 3 options]'
        )
        .nullish(),
      left: z
        .number()
        .describe(
          'The distance, in points, from the left side of the chart to the worksheet origin. [Simplified from 3 options]'
        )
        .nullish(),
      name: z.string().describe('Represents the name of a chart object.').nullish(),
      top: z
        .number()
        .describe(
          'Represents the distance, in points, from the top edge of the object to the top of row 1 (on a worksheet) or the top of the chart area (on a chart). [Simplified from 3 options]'
        )
        .nullish(),
      width: z
        .number()
        .describe(
          'Represents the width, in points, of the chart object. [Simplified from 3 options]'
        )
        .nullish(),
      axes: microsoft_graph_workbookChartAxes.optional(),
      dataLabels: microsoft_graph_workbookChartDataLabels.optional(),
      format: microsoft_graph_workbookChartAreaFormat.optional(),
      legend: microsoft_graph_workbookChartLegend.optional(),
      series: z
        .array(microsoft_graph_workbookChartSeries)
        .describe(
          'Represents either a single series or collection of series in the chart. Read-only.'
        )
        .optional(),
      title: microsoft_graph_workbookChartTitle.optional(),
      worksheet: microsoft_graph_workbookWorksheet.optional(),
    })
    .passthrough()
);
const microsoft_graph_workbookNamedItem: z.ZodType<microsoft_graph_workbookNamedItem> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      comment: z.string().describe('The comment associated with this name.').nullish(),
      name: z.string().describe('The name of the object. Read-only.').nullish(),
      scope: z
        .string()
        .describe(
          'Indicates whether the name is scoped to the workbook or to a specific worksheet. Read-only.'
        )
        .optional(),
      type: z
        .string()
        .describe(
          'The type of reference is associated with the name. The possible values are: String, Integer, Double, Boolean, Range. Read-only.'
        )
        .nullish(),
      value: z
        .unknown()
        .describe(
          'The formula that the name is defined to refer to. For example, =Sheet14!$B$2:$H$12 and =4.75. Read-only.'
        )
        .optional(),
      visible: z.boolean().describe('Indicates whether the object is visible.').optional(),
      worksheet: microsoft_graph_workbookWorksheet.optional(),
    })
    .passthrough()
);
const microsoft_graph_workbookPivotTable: z.ZodType<microsoft_graph_workbookPivotTable> = z.lazy(
  () =>
    z
      .object({
        id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
        name: z.string().describe('The name of the pivot table.').nullish(),
        worksheet: microsoft_graph_workbookWorksheet.optional(),
      })
      .passthrough()
);
const microsoft_graph_workbookWorksheetProtectionOptions = z
  .object({
    allowAutoFilter: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow the use of the autofilter feature is enabled.'
      )
      .optional(),
    allowDeleteColumns: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow deleting columns is enabled.'
      )
      .optional(),
    allowDeleteRows: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow deleting rows is enabled.'
      )
      .optional(),
    allowFormatCells: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow formatting cells is enabled.'
      )
      .optional(),
    allowFormatColumns: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow formatting columns is enabled.'
      )
      .optional(),
    allowFormatRows: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow formatting rows is enabled.'
      )
      .optional(),
    allowInsertColumns: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow inserting columns is enabled.'
      )
      .optional(),
    allowInsertHyperlinks: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow inserting hyperlinks is enabled.'
      )
      .optional(),
    allowInsertRows: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow inserting rows is enabled.'
      )
      .optional(),
    allowPivotTables: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow the use of the pivot table feature is enabled.'
      )
      .optional(),
    allowSort: z
      .boolean()
      .describe(
        'Indicates whether the worksheet protection option to allow the use of the sort feature is enabled.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_workbookWorksheetProtection = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    options: microsoft_graph_workbookWorksheetProtectionOptions.optional(),
    protected: z
      .boolean()
      .describe('Indicates whether the worksheet is protected.  Read-only.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_workbookWorksheet: z.ZodType<microsoft_graph_workbookWorksheet> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      name: z.string().describe('The display name of the worksheet.').nullish(),
      position: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The zero-based position of the worksheet within the workbook.')
        .optional(),
      visibility: z
        .string()
        .describe(
          'The visibility of the worksheet. The possible values are: Visible, Hidden, VeryHidden.'
        )
        .optional(),
      charts: z
        .array(microsoft_graph_workbookChart)
        .describe('The list of charts that are part of the worksheet. Read-only.')
        .optional(),
      names: z
        .array(microsoft_graph_workbookNamedItem)
        .describe('The list of names that are associated with the worksheet. Read-only.')
        .optional(),
      pivotTables: z
        .array(microsoft_graph_workbookPivotTable)
        .describe('The list of piot tables that are part of the worksheet.')
        .optional(),
      protection: microsoft_graph_workbookWorksheetProtection.optional(),
      tables: z
        .array(microsoft_graph_workbookTable)
        .describe('The list of tables that are part of the worksheet. Read-only.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_workbookTable: z.ZodType<microsoft_graph_workbookTable> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      highlightFirstColumn: z
        .boolean()
        .describe('Indicates whether the first column contains special formatting.')
        .optional(),
      highlightLastColumn: z
        .boolean()
        .describe('Indicates whether the last column contains special formatting.')
        .optional(),
      legacyId: z
        .string()
        .describe(
          "A legacy identifier used in older Excel clients. The value of the identifier remains the same even when the table is renamed. This property should be interpreted as an opaque string value and shouldn't be parsed to any other type. Read-only."
        )
        .nullish(),
      name: z.string().describe('The name of the table.').nullish(),
      showBandedColumns: z
        .boolean()
        .describe(
          'Indicates whether the columns show banded formatting in which odd columns are highlighted differently from even ones to make reading the table easier.'
        )
        .optional(),
      showBandedRows: z
        .boolean()
        .describe(
          'Indicates whether the rows show banded formatting in which odd rows are highlighted differently from even ones to make reading the table easier.'
        )
        .optional(),
      showFilterButton: z
        .boolean()
        .describe(
          'Indicates whether the filter buttons are visible at the top of each column header. Setting this is only allowed if the table contains a header row.'
        )
        .optional(),
      showHeaders: z
        .boolean()
        .describe(
          'Indicates whether the header row is visible or not. This value can be set to show or remove the header row.'
        )
        .optional(),
      showTotals: z
        .boolean()
        .describe(
          'Indicates whether the total row is visible or not. This value can be set to show or remove the total row.'
        )
        .optional(),
      style: z
        .string()
        .describe(
          'A constant value that represents the Table style. The possible values are: TableStyleLight1 through TableStyleLight21, TableStyleMedium1 through TableStyleMedium28, TableStyleStyleDark1 through TableStyleStyleDark11. A custom user-defined style present in the workbook can also be specified.'
        )
        .nullish(),
      columns: z
        .array(microsoft_graph_workbookTableColumn)
        .describe('The list of all the columns in the table. Read-only.')
        .optional(),
      rows: z
        .array(microsoft_graph_workbookTableRow)
        .describe('The list of all the rows in the table. Read-only.')
        .optional(),
      sort: microsoft_graph_workbookTableSort.optional(),
      worksheet: microsoft_graph_workbookWorksheet.optional(),
    })
    .passthrough()
);
const microsoft_graph_workbookTableCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_workbookTable),
  })
  .partial()
  .passthrough();
const microsoft_graph_workbookTableRowCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_workbookTableRow),
  })
  .partial()
  .passthrough();
const microsoft_graph_workbookWorksheetCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_workbookWorksheet),
  })
  .partial()
  .passthrough();
const create_excel_chart_Body = z
  .object({ type: z.string(), sourceData: z.unknown(), seriesBy: z.string() })
  .partial()
  .passthrough();
const microsoft_graph_workbookRangeSort = z
  .object({ id: z.string().describe('The unique identifier for an entity. Read-only.').optional() })
  .passthrough();
const microsoft_graph_workbookRangeBorder = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    color: z
      .string()
      .describe(
        "The HTML color code that represents the color of the border line. Can either be of the form #RRGGBB, for example 'FFA500', or a named HTML color, for example 'orange'."
      )
      .nullish(),
    sideIndex: z
      .string()
      .describe(
        'Indicates the specific side of the border. The possible values are: EdgeTop, EdgeBottom, EdgeLeft, EdgeRight, InsideVertical, InsideHorizontal, DiagonalDown, DiagonalUp. Read-only.'
      )
      .nullish(),
    style: z
      .string()
      .describe(
        'Indicates the line style for the border. The possible values are: None, Continuous, Dash, DashDot, DashDotDot, Dot, Double, SlantDashDot.'
      )
      .nullish(),
    weight: z
      .string()
      .describe(
        'The weight of the border around a range. The possible values are: Hairline, Thin, Medium, Thick.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workbookRangeFill = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    color: z
      .string()
      .describe(
        "HTML color code representing the color of the border line. Can either be of the form #RRGGBB, for example 'FFA500', or be a named HTML color, for example 'orange'."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workbookRangeFont = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    bold: z.boolean().describe('Inidicates whether the font is bold.').nullish(),
    color: z
      .string()
      .describe(
        'The HTML color code representation of the text color. For example, #FF0000 represents the color red.'
      )
      .nullish(),
    italic: z.boolean().describe('Inidicates whether the font is italic.').nullish(),
    name: z.string().describe("The font name. For example, 'Calibri'.").nullish(),
    size: z.number().describe('The font size. [Simplified from 3 options]').nullish(),
    underline: z
      .string()
      .describe(
        'The type of underlining applied to the font. The possible values are: None, Single, Double, SingleAccountant, DoubleAccountant.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workbookFormatProtection = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    formulaHidden: z
      .boolean()
      .describe(
        "Indicates whether Excel hides the formula for the cells in the range. A null value indicates that the entire range doesn't have uniform formula hidden setting."
      )
      .nullish(),
    locked: z
      .boolean()
      .describe(
        "Indicates whether Excel locks the cells in the object. A null value indicates that the entire range doesn't have uniform lock setting."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workbookRangeFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    columnWidth: z
      .number()
      .describe(
        "The width of all columns within the range. If the column widths aren't uniform, null will be returned. [Simplified from 3 options]"
      )
      .nullish(),
    horizontalAlignment: z
      .string()
      .describe(
        'The horizontal alignment for the specified object. The possible values are: General, Left, Center, Right, Fill, Justify, CenterAcrossSelection, Distributed.'
      )
      .nullish(),
    rowHeight: z
      .number()
      .describe(
        "The height of all rows in the range. If the row heights aren't uniform null will be returned. [Simplified from 3 options]"
      )
      .nullish(),
    verticalAlignment: z
      .string()
      .describe(
        'The vertical alignment for the specified object. The possible values are: Top, Center, Bottom, Justify, Distributed.'
      )
      .nullish(),
    wrapText: z
      .boolean()
      .describe(
        "Indicates whether Excel wraps the text in the object. A null value indicates that the entire range doesn't have a uniform wrap setting."
      )
      .nullish(),
    borders: z
      .array(microsoft_graph_workbookRangeBorder)
      .describe('Collection of border objects that apply to the overall range selected Read-only.')
      .optional(),
    fill: microsoft_graph_workbookRangeFill.optional(),
    font: microsoft_graph_workbookRangeFont.optional(),
    protection: microsoft_graph_workbookFormatProtection.optional(),
  })
  .passthrough();
const microsoft_graph_workbookRange = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    address: z
      .string()
      .describe(
        'Represents the range reference in A1-style. Address value contains the Sheet reference (for example, Sheet1!A1:B4). Read-only.'
      )
      .nullish(),
    addressLocal: z
      .string()
      .describe(
        'Represents range reference for the specified range in the language of the user. Read-only.'
      )
      .nullish(),
    cellCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of cells in the range. Read-only.')
      .optional(),
    columnCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Represents the total number of columns in the range. Read-only.')
      .optional(),
    columnHidden: z
      .boolean()
      .describe('Indicates whether all columns of the current range are hidden.')
      .nullish(),
    columnIndex: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'Represents the column number of the first cell in the range. Zero-indexed. Read-only.'
      )
      .optional(),
    formulas: z.unknown().describe('Represents the formula in A1-style notation.').optional(),
    formulasLocal: z
      .unknown()
      .describe(
        "Represents the formula in A1-style notation, in the user's language and number-formatting locale.  For example, the English '=SUM(A1, 1.5)' formula would become '=SUMME(A1; 1,5)' in German."
      )
      .optional(),
    formulasR1C1: z.unknown().describe('Represents the formula in R1C1-style notation.').optional(),
    hidden: z
      .boolean()
      .describe('Represents if all cells of the current range are hidden. Read-only.')
      .nullish(),
    numberFormat: z
      .unknown()
      .describe("Represents Excel's number format code for the given cell.")
      .optional(),
    rowCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Returns the total number of rows in the range. Read-only.')
      .optional(),
    rowHidden: z
      .boolean()
      .describe('Indicates whether all rows of the current range are hidden.')
      .nullish(),
    rowIndex: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Returns the row number of the first cell in the range. Zero-indexed. Read-only.')
      .optional(),
    text: z
      .unknown()
      .describe(
        "Text values of the specified range. The Text value doesn't depend on the cell width. The # sign substitution that happens in Excel UI doesn't affect the text value returned by the API. Read-only."
      )
      .optional(),
    values: z
      .unknown()
      .describe(
        'Represents the raw values of the specified range. The data returned can be of type string, number, or a Boolean. Cell that contains an error returns the error string.'
      )
      .optional(),
    valueTypes: z
      .unknown()
      .describe(
        'Represents the type of data of each cell. The possible values are: Unknown, Empty, String, Integer, Double, Boolean, Error. Read-only.'
      )
      .optional(),
    format: microsoft_graph_workbookRangeFormat.optional(),
    sort: microsoft_graph_workbookRangeSort.optional(),
    worksheet: microsoft_graph_workbookWorksheet.optional(),
  })
  .passthrough();
const create_excel_table_Body = z
  .object({ address: z.string().nullable(), hasHeaders: z.boolean().default(false) })
  .partial()
  .passthrough();
const microsoft_graph_assignedLabel = z
  .object({
    displayName: z.string().describe('The display name of the label. Read-only.').nullish(),
    labelId: z.string().describe('The unique identifier of the label.').nullish(),
  })
  .passthrough();
const microsoft_graph_licenseProcessingState = z.object({ state: z.string().nullish() }).passthrough();
const microsoft_graph_group = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z
      .string()
      .describe(
        "The display name for the group. This property is required when a group is created and can't be cleared during updates. Maximum length is 256 characters. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values), $search, and $orderby."
      )
      .nullish(),
    description: z
      .string()
      .describe(
        'An optional description for the group. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith) and $search.'
      )
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Timestamp of when the group was created. The value can't be modified and is automatically populated when the group is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Read-only."
      )
      .nullish(),
    deletedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Date and time when this object was deleted. Always null when the object hasn't been deleted."
      )
      .nullish(),
    allowExternalSenders: z
      .boolean()
      .describe(
        'Indicates if people external to the organization can send messages to the group. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID}).'
      )
      .nullish(),
    assignedLabels: z
      .array(microsoft_graph_assignedLabel)
      .describe(
        'The list of sensitivity label pairs (label ID, label name) associated with a Microsoft 365 group. Requires $select to retrieve. This property can be updated only in delegated scenarios where the caller requires both the Microsoft Graph permission and a supported administrator role.'
      )
      .optional(),
    assignedLicenses: z
      .array(microsoft_graph_assignedLicense)
      .describe(
        'The licenses that are assigned to the group. Requires $select to retrieve. Supports $filter (eq). Read-only.'
      )
      .optional(),
    autoSubscribeNewMembers: z
      .boolean()
      .describe(
        "Indicates if new members added to the group are autosubscribed to receive email notifications. You can set this property in a PATCH request for the group; don't set it in the initial POST request that creates the group. Default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
      )
      .nullish(),
    classification: z
      .string()
      .describe(
        'Describes a classification for the group (such as low, medium, or high business impact). Valid values for this property are defined by creating a ClassificationList setting value, based on the template definition.Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
      )
      .nullish(),
    expirationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Timestamp of when the group is set to expire. It's null for security groups, but for Microsoft 365 groups, it represents when the group is set to expire as defined in the groupLifecyclePolicy. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Supports $filter (eq, ne, not, ge, le, in). Read-only."
      )
      .nullish(),
    groupTypes: z
      .array(z.string())
      .describe(
        "Specifies the group type and its membership. If the collection contains Unified, the group is a Microsoft 365 group; otherwise, it's either a security group or a distribution group. For details, see groups overview.If the collection includes DynamicMembership, the group has dynamic membership; otherwise, membership is static. Returned by default. Supports $filter (eq, not)."
      )
      .optional(),
    hasMembersWithLicenseErrors: z
      .boolean()
      .describe(
        'Indicates whether there are members in this group that have license errors from its group-based license assignment. This property is never returned on a GET operation. You can use it as a $filter argument to get groups that have members with license errors (that is, filter for this property being true). See an example. Supports $filter (eq).'
      )
      .nullish(),
    hideFromAddressLists: z
      .boolean()
      .describe(
        "True if the group isn't displayed in certain parts of the Outlook UI: the Address Book, address lists for selecting message recipients, and the Browse Groups dialog for searching groups; otherwise, false. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
      )
      .nullish(),
    hideFromOutlookClients: z
      .boolean()
      .describe(
        "True if the group isn't displayed in Outlook clients, such as Outlook for Windows and Outlook on the web; otherwise, false. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
      )
      .nullish(),
    infoCatalogs: z.array(z.string()).optional(),
    isArchived: z
      .boolean()
      .describe(
        'When a group is associated with a team, this property determines whether the team is in read-only mode.To read this property, use the /group/{groupId}/team endpoint or the Get team API. To update this property, use the archiveTeam and unarchiveTeam APIs.'
      )
      .nullish(),
    isAssignableToRole: z
      .boolean()
      .describe(
        "Indicates whether this group can be assigned to a Microsoft Entra role. Optional. This property can only be set while creating the group and is immutable. If set to true, the securityEnabled property must also be set to true, visibility must be Hidden, and the group can't be a dynamic group (that is, groupTypes can't contain DynamicMembership). Only callers with at least the Privileged Role Administrator role can set this property. The caller must also be assigned the RoleManagement.ReadWrite.Directory permission to set this property or update the membership of such groups. For more, see Using a group to manage Microsoft Entra role assignmentsUsing this feature requires a Microsoft Entra ID P1 license. Returned by default. Supports $filter (eq, ne, not)."
      )
      .nullish(),
    isManagementRestricted: z
      .boolean()
      .describe(
        'Indicates whether the group is a member of a restricted management administrative unit. If not set, the default value is null and the default behavior is false. Read-only.  To manage a group member of a restricted management administrative unit, the administrator or calling app must be assigned a Microsoft Entra role at the scope of the restricted management administrative unit. Requires $select to retrieve.'
      )
      .nullish(),
    isSubscribedByMail: z
      .boolean()
      .describe(
        'Indicates whether the signed-in user is subscribed to receive email conversations. The default value is true. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID}).'
      )
      .nullish(),
    licenseProcessingState: microsoft_graph_licenseProcessingState.optional(),
    mail: z
      .string()
      .describe(
        "The SMTP address for the group, for example, 'serviceadmins@contoso.com'. Returned by default. Read-only. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
      )
      .nullish(),
    mailEnabled: z
      .boolean()
      .describe(
        'Specifies whether the group is mail-enabled. Required. Returned by default. Supports $filter (eq, ne, not).'
      )
      .nullish(),
    mailNickname: z
      .string()
      .describe(
        "The mail alias for the group, unique for Microsoft 365 groups in the organization. Maximum length is 64 characters. This property can contain only characters in the ASCII character set 0 - 127 except the following characters: @ () / [] ' ; : <> , SPACE. Required. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
      )
      .nullish(),
    membershipRule: z
      .string()
      .describe(
        'The rule that determines members for this group if the group is a dynamic group (groupTypes contains DynamicMembership). For more information about the syntax of the membership rule, see Membership Rules syntax. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
      )
      .nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_groupCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_group),
  })
  .partial()
  .passthrough();
const microsoft_graph_eventType = z.enum([
  'singleInstance',
  'occurrence',
  'exception',
  'seriesMaster',
]);
const microsoft_graph_attachment = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    contentType: z.string().describe('The MIME type.').nullish(),
    isInline: z
      .boolean()
      .describe('true if the attachment is an inline attachment; otherwise, false.')
      .optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    name: z.string().describe("The attachment's file name.").nullish(),
    size: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The length of the attachment in bytes.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_singleValueLegacyExtendedProperty = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    value: z.string().describe('A property value.').nullish(),
  })
  .passthrough();
const microsoft_graph_multiValueLegacyExtendedProperty = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    value: z.array(z.string().nullable()).describe('A collection of property values.').optional(),
  })
  .passthrough();
const microsoft_graph_physicalAddress = z
  .object({
    city: z.string().describe('The city.').nullish(),
    countryOrRegion: z
      .string()
      .describe(
        "The country or region. It's a free-format string value, for example, 'United States'."
      )
      .nullish(),
    postalCode: z.string().describe('The postal code.').nullish(),
    state: z.string().describe('The state.').nullish(),
    street: z.string().describe('The street.').nullish(),
  })
  .passthrough();
const microsoft_graph_outlookGeoCoordinates = z
  .object({
    accuracy: z
      .number()
      .describe(
        'The accuracy of the latitude and longitude. As an example, the accuracy can be measured in meters, such as the latitude and longitude are accurate to within 50 meters. [Simplified from 3 options]'
      )
      .nullish(),
    altitude: z
      .number()
      .describe('The altitude of the location. [Simplified from 3 options]')
      .nullish(),
    altitudeAccuracy: z
      .number()
      .describe('The accuracy of the altitude. [Simplified from 3 options]')
      .nullish(),
    latitude: z
      .number()
      .describe('The latitude of the location. [Simplified from 3 options]')
      .nullish(),
    longitude: z
      .number()
      .describe('The longitude of the location. [Simplified from 3 options]')
      .nullish(),
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
    address: microsoft_graph_physicalAddress.optional(),
    coordinates: microsoft_graph_outlookGeoCoordinates.optional(),
    displayName: z.string().describe('The name associated with the location.').nullish(),
    locationEmailAddress: z.string().describe('Optional email address of the location.').nullish(),
    locationType: microsoft_graph_locationType.optional(),
    locationUri: z.string().describe('Optional URI representing the location.').nullish(),
    uniqueId: z.string().describe('For internal use only.').nullish(),
    uniqueIdType: microsoft_graph_locationUniqueIdType.optional(),
  })
  .passthrough();
const microsoft_graph_freeBusyStatus = z.enum([
  'unknown',
  'free',
  'tentative',
  'busy',
  'oof',
  'workingElsewhere',
]);
const microsoft_graph_sensitivity = z.enum(['normal', 'personal', 'private', 'confidential']);
const microsoft_graph_importance = z.enum(['low', 'normal', 'high']);
const microsoft_graph_emailAddress = z
  .object({
    address: z.string().describe('The email address of the person or entity.').nullish(),
    name: z.string().describe('The display name of the person or entity.').nullish(),
  })
  .passthrough();
const microsoft_graph_attendeeType = z.enum(['required', 'optional', 'resource']);
const microsoft_graph_timeSlot = z
  .object({
    end: microsoft_graph_dateTimeTimeZone.optional(),
    start: microsoft_graph_dateTimeTimeZone.optional(),
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
    response: microsoft_graph_responseType.optional(),
    time: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time when the response was returned. It uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_attendee = z
  .object({
    emailAddress: microsoft_graph_emailAddress.optional(),
    type: microsoft_graph_attendeeType.optional(),
    proposedNewTime: microsoft_graph_timeSlot.optional(),
    status: microsoft_graph_responseStatus.optional(),
  })
  .passthrough();
const microsoft_graph_dayOfWeek = z.enum([
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]);
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
      )
      .optional(),
    daysOfWeek: z
      .array(z.union([microsoft_graph_dayOfWeek, z.object({}).partial().passthrough()]))
      .describe(
        'A collection of the days of the week on which the event occurs. The possible values are: sunday, monday, tuesday, wednesday, thursday, friday, saturday. If type is relativeMonthly or relativeYearly, and daysOfWeek specifies more than one day, the event falls on the first day that satisfies the pattern.  Required if type is weekly, relativeMonthly, or relativeYearly.'
      )
      .optional(),
    firstDayOfWeek: microsoft_graph_dayOfWeek.optional(),
    index: microsoft_graph_weekIndex.optional(),
    interval: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The number of units between occurrences, where units can be in days, weeks, months, or years, depending on the type. Required.'
      )
      .optional(),
    month: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The month in which the event occurs.  This is a number from 1 to 12.')
      .optional(),
    type: microsoft_graph_recurrencePatternType.optional(),
  })
  .passthrough();
const microsoft_graph_recurrenceRangeType = z.enum(['endDate', 'noEnd', 'numbered']);
const microsoft_graph_recurrenceRange = z
  .object({
    endDate: z
      .string()
      .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
      .describe(
        'The date to stop applying the recurrence pattern. Depending on the recurrence pattern of the event, the last occurrence of the meeting may not be this date. Required if type is endDate.'
      )
      .nullish(),
    numberOfOccurrences: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The number of times to repeat the event. Required and must be positive if type is numbered.'
      )
      .optional(),
    recurrenceTimeZone: z
      .string()
      .describe(
        'Time zone for the startDate and endDate properties. Optional. If not specified, the time zone of the event is used.'
      )
      .nullish(),
    startDate: z
      .string()
      .regex(/^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/)
      .describe(
        'The date to start applying the recurrence pattern. The first occurrence of the meeting may be this date or later, depending on the recurrence pattern of the event. Must be the same value as the start property of the recurring event. Required.'
      )
      .nullish(),
    type: microsoft_graph_recurrenceRangeType.optional(),
  })
  .passthrough();
const microsoft_graph_patternedRecurrence = z
  .object({
    pattern: microsoft_graph_recurrencePattern.optional(),
    range: microsoft_graph_recurrenceRange.optional(),
  })
  .passthrough();
const microsoft_graph_event = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    type: microsoft_graph_eventType.optional(),
    body: microsoft_graph_itemBody.optional(),
    subject: z.string().describe("The text of the event's subject line.").nullish(),
    attachments: z
      .array(microsoft_graph_attachment)
      .describe(
        'The collection of FileAttachment, ItemAttachment, and referenceAttachment attachments for the event. Navigation property. Read-only. Nullable.'
      )
      .optional(),
    singleValueExtendedProperties: z
      .array(microsoft_graph_singleValueLegacyExtendedProperty)
      .describe(
        'The collection of single-value extended properties defined for the event. Read-only. Nullable.'
      )
      .optional(),
    multiValueExtendedProperties: z
      .array(microsoft_graph_multiValueLegacyExtendedProperty)
      .describe(
        'The collection of multi-value extended properties defined for the event. Read-only. Nullable.'
      )
      .optional(),
    start: microsoft_graph_dateTimeTimeZone.optional(),
    end: microsoft_graph_dateTimeTimeZone.optional(),
    location: microsoft_graph_location.optional(),
    showAs: microsoft_graph_freeBusyStatus.optional(),
    sensitivity: microsoft_graph_sensitivity.optional(),
    isAllDay: z
      .boolean()
      .describe(
        "Set to true if the event lasts all day. If true, regardless of whether it's a single-day or multi-day event, start, and endtime must be set to midnight and be in the same time zone."
      )
      .nullish(),
    importance: microsoft_graph_importance.optional(),
    isOnlineMeeting: z
      .boolean()
      .describe(
        'True if this event has online meeting information (that is, onlineMeeting points to an onlineMeetingInfo resource), false otherwise. Default is false (onlineMeeting is null). Optional.  After you set isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting. Subsequently, Outlook ignores any further changes to isOnlineMeeting, and the meeting remains available online.'
      )
      .nullish(),
    isReminderOn: z
      .boolean()
      .describe('Set to true if an alert is set to remind the user of the event.')
      .nullish(),
    attendees: z
      .array(microsoft_graph_attendee)
      .describe('The collection of attendees for the event.')
      .optional(),
    recurrence: microsoft_graph_patternedRecurrence.optional(),
    reminderMinutesBeforeStart: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of minutes before the event start time that the reminder alert occurs.')
      .nullish(),
    allowNewTimeProposals: z
      .boolean()
      .describe(
        'true if the meeting organizer allows invitees to propose a new time when responding; otherwise, false. Optional. The default is true.'
      )
      .nullish(),
    responseRequested: z
      .boolean()
      .describe(
        'Default is true, which represents the organizer would like an invitee to send a response to the event.'
      )
      .nullish(),
    categories: z
      .array(z.string().nullable())
      .describe('The categories associated with the item')
      .optional(),
    changeKey: z
      .string()
      .describe(
        'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
      )
      .nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_eventCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_event),
  })
  .partial()
  .passthrough();
const microsoft_graph_recipient = z
  .object({ emailAddress: microsoft_graph_emailAddress.optional() })
  .passthrough();
const microsoft_graph_extension = z
  .object({ id: z.string().describe('The unique identifier for an entity. Read-only.').optional() })
  .passthrough();
const microsoft_graph_post: z.ZodType<microsoft_graph_post> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      categories: z
        .array(z.string().nullable())
        .describe('The categories associated with the item')
        .optional(),
      changeKey: z
        .string()
        .describe(
          'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
        )
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullish(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .nullish(),
      body: microsoft_graph_itemBody.optional(),
      conversationId: z.string().describe('Unique ID of the conversation. Read-only.').nullish(),
      conversationThreadId: z
        .string()
        .describe('Unique ID of the conversation thread. Read-only.')
        .nullish(),
      from: microsoft_graph_recipient.optional(),
      hasAttachments: z
        .boolean()
        .describe(
          'Indicates whether the post has at least one attachment. This is a default property.'
        )
        .optional(),
      newParticipants: z
        .array(microsoft_graph_recipient)
        .describe('Conversation participants that were added to the thread as part of this post.')
        .optional(),
      receivedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Specifies when the post was received. The DateTimeOffset type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
        )
        .optional(),
      sender: microsoft_graph_recipient.optional(),
      attachments: z
        .array(microsoft_graph_attachment)
        .describe('Read-only. Nullable. Supports $expand.')
        .optional(),
      extensions: z
        .array(microsoft_graph_extension)
        .describe(
          'The collection of open extensions defined for the post. Read-only. Nullable. Supports $expand.'
        )
        .optional(),
      inReplyTo: microsoft_graph_post.optional(),
      multiValueExtendedProperties: z
        .array(microsoft_graph_multiValueLegacyExtendedProperty)
        .describe(
          'The collection of multi-value extended properties defined for the post. Read-only. Nullable.'
        )
        .optional(),
      singleValueExtendedProperties: z
        .array(microsoft_graph_singleValueLegacyExtendedProperty)
        .describe(
          'The collection of single-value extended properties defined for the post. Read-only. Nullable.'
        )
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_conversationThread = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    ccRecipients: z
      .array(microsoft_graph_recipient)
      .describe('The Cc: recipients for the thread. Requires $select to retrieve.')
      .optional(),
    hasAttachments: z
      .boolean()
      .describe(
        'Indicates whether any of the posts within this thread has at least one attachment. Returned by default.'
      )
      .optional(),
    isLocked: z
      .boolean()
      .describe('Indicates if the thread is locked. Returned by default.')
      .optional(),
    lastDeliveredDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.Returned by default.'
      )
      .optional(),
    preview: z
      .string()
      .describe(
        'A short summary from the body of the latest post in this conversation. Returned by default.'
      )
      .optional(),
    topic: z
      .string()
      .describe(
        'The topic of the conversation. This property can be set when the conversation is created, but it cannot be updated. Returned by default.'
      )
      .optional(),
    toRecipients: z
      .array(microsoft_graph_recipient)
      .describe('The To: recipients for the thread. Requires $select to retrieve.')
      .optional(),
    uniqueSenders: z
      .array(z.string())
      .describe('All the users that sent a message to this thread. Returned by default.')
      .optional(),
    posts: z.array(microsoft_graph_post).optional(),
  })
  .passthrough();
const microsoft_graph_conversation = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    hasAttachments: z
      .boolean()
      .describe(
        'Indicates whether any of the posts within this Conversation has at least one attachment. Supports $filter (eq, ne) and $search.'
      )
      .optional(),
    lastDeliveredDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .optional(),
    preview: z
      .string()
      .describe(
        'A short summary from the body of the latest post in this conversation. Supports $filter (eq, ne, le, ge).'
      )
      .optional(),
    topic: z
      .string()
      .describe(
        'The topic of the conversation. This property can be set when the conversation is created, but it cannot be updated.'
      )
      .optional(),
    uniqueSenders: z
      .array(z.string())
      .describe('All the users that sent a message to this Conversation.')
      .optional(),
    threads: z
      .array(microsoft_graph_conversationThread)
      .describe(
        'A collection of all the conversation threads in the conversation. A navigation property. Read-only. Nullable.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_conversationCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_conversation),
  })
  .partial()
  .passthrough();
const microsoft_graph_directoryObject = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    deletedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Date and time when this object was deleted. Always null when the object hasn't been deleted."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_directoryObjectCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_directoryObject),
  })
  .partial()
  .passthrough();
const ReferenceCreate = z.record(z.object({}).partial().passthrough());
const microsoft_graph_conversationThreadCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_conversationThread),
  })
  .partial()
  .passthrough();
const reply_to_group_thread_Body = z.object({ Post: microsoft_graph_post }).partial().passthrough();
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
const microsoft_graph_calendarPermission = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    allowedRoles: z
      .array(z.union([microsoft_graph_calendarRoleType, z.object({}).partial().passthrough()]))
      .describe(
        'List of allowed sharing or delegating permission levels for the calendar. The possible values are: none, freeBusyRead, limitedRead, read, write, delegateWithoutPrivateEventAccess, delegateWithPrivateEventAccess, custom.'
      )
      .optional(),
    emailAddress: microsoft_graph_emailAddress.optional(),
    isInsideOrganization: z
      .boolean()
      .describe(
        'True if the user in context (recipient or delegate) is inside the same organization as the calendar owner.'
      )
      .nullish(),
    isRemovable: z
      .boolean()
      .describe(
        "True if the user can be removed from the list of recipients or delegates for the specified calendar, false otherwise. The 'My organization' user determines the permissions other people within your organization have to the given calendar. You can't remove 'My organization' as a share recipient to a calendar."
      )
      .nullish(),
    role: microsoft_graph_calendarRoleType.optional(),
  })
  .passthrough();
const microsoft_graph_calendarPermissionCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_calendarPermission),
  })
  .partial()
  .passthrough();
const get_schedule_Body = z
  .object({
    Schedules: z.array(z.string().nullable()),
    EndTime: z.union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()]),
    StartTime: z.union([microsoft_graph_dateTimeTimeZone, z.object({}).partial().passthrough()]),
    AvailabilityViewInterval: z.number().gte(-2147483648).lte(2147483647).nullable(),
  })
  .partial()
  .passthrough();
const microsoft_graph_freeBusyError = z
  .object({
    message: z.string().describe('Describes the error.').nullish(),
    responseCode: z
      .string()
      .describe(
        'The response code from querying for the availability of the user, distribution list, or resource.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_scheduleItem = z
  .object({
    end: microsoft_graph_dateTimeTimeZone.optional(),
    isPrivate: z
      .boolean()
      .describe(
        'The sensitivity of the corresponding event. True if the event is marked private, false otherwise. Optional.'
      )
      .nullish(),
    location: z
      .string()
      .describe('The location where the corresponding event is held or attended from. Optional.')
      .nullish(),
    start: microsoft_graph_dateTimeTimeZone.optional(),
    status: microsoft_graph_freeBusyStatus.optional(),
    subject: z.string().describe("The corresponding event's subject line. Optional.").nullish(),
  })
  .passthrough();
const microsoft_graph_timeZoneBase = z
  .object({
    name: z
      .string()
      .describe(
        "The name of a time zone. It can be a standard time zone name such as 'Hawaii-Aleutian Standard Time', or 'Customized Time Zone' for a custom time zone."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_workingHours = z
  .object({
    daysOfWeek: z
      .array(z.union([microsoft_graph_dayOfWeek, z.object({}).partial().passthrough()]))
      .describe('The days of the week on which the user works.')
      .optional(),
    endTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .describe('The time of the day that the user stops working.')
      .nullish(),
    startTime: z
      .string()
      .regex(/^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?$/)
      .describe('The time of the day that the user starts working.')
      .nullish(),
    timeZone: microsoft_graph_timeZoneBase.optional(),
  })
  .passthrough();
const microsoft_graph_scheduleInformation = z
  .object({
    availabilityView: z
      .string()
      .describe(
        'Represents a merged view of availability of all the items in scheduleItems. The view consists of time slots. Availability during each time slot is indicated with: 0= free or working elswhere, 1= tentative, 2= busy, 3= out of office.Note: Working elsewhere is set to 0 instead of 4 for backward compatibility. For details, see the Q&A and Exchange 2007 and Exchange 2010 do not use the WorkingElsewhere value.'
      )
      .nullish(),
    error: microsoft_graph_freeBusyError.optional(),
    scheduleId: z
      .string()
      .describe(
        'An SMTP address of the user, distribution list, or resource, identifying an instance of scheduleInformation.'
      )
      .nullish(),
    scheduleItems: z
      .array(microsoft_graph_scheduleItem)
      .describe('Contains the items that describe the availability of the user or resource.')
      .optional(),
    workingHours: microsoft_graph_workingHours.optional(),
  })
  .passthrough();
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
const microsoft_graph_calendar = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    allowedOnlineMeetingProviders: z
      .array(z.union([microsoft_graph_onlineMeetingProviderType, z.object({}).partial().passthrough()]))
      .describe(
        'Represent the online meeting service providers that can be used to create online meetings in this calendar. The possible values are: unknown, skypeForBusiness, skypeForConsumer, teamsForBusiness.'
      )
      .optional(),
    canEdit: z
      .boolean()
      .describe(
        'true if the user can write to the calendar, false otherwise. This property is true for the user who created the calendar. This property is also true for a user who shared a calendar and granted write access.'
      )
      .nullish(),
    canShare: z
      .boolean()
      .describe(
        'true if the user has permission to share the calendar, false otherwise. Only the user who created the calendar can share it.'
      )
      .nullish(),
    canViewPrivateItems: z
      .boolean()
      .describe(
        'If true, the user can read calendar items that have been marked private, false otherwise.'
      )
      .nullish(),
    changeKey: z
      .string()
      .describe(
        'Identifies the version of the calendar object. Every time the calendar is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
      )
      .nullish(),
    color: microsoft_graph_calendarColor.optional(),
    defaultOnlineMeetingProvider: microsoft_graph_onlineMeetingProviderType.optional(),
    hexColor: z
      .string()
      .describe(
        'The calendar color, expressed in a hex color code of three hexadecimal values, each ranging from 00 to FF and representing the red, green, or blue components of the color in the RGB color space. If the user has never explicitly set a color for the calendar, this property is empty. Read-only.'
      )
      .nullish(),
    isDefaultCalendar: z
      .boolean()
      .describe(
        'true if this is the default calendar where new events are created by default, false otherwise.'
      )
      .nullish(),
    isRemovable: z
      .boolean()
      .describe('Indicates whether this user calendar can be deleted from the user mailbox.')
      .nullish(),
    isTallyingResponses: z
      .boolean()
      .describe(
        "Indicates whether this user calendar supports tracking of meeting responses. Only meeting invites sent from users' primary calendars support tracking of meeting responses."
      )
      .nullish(),
    name: z.string().describe('The calendar name.').nullish(),
    owner: microsoft_graph_emailAddress.optional(),
    calendarPermissions: z
      .array(microsoft_graph_calendarPermission)
      .describe('The permissions of the users with whom the calendar is shared.')
      .optional(),
    calendarView: z
      .array(microsoft_graph_event)
      .describe('The calendar view for the calendar. Navigation property. Read-only.')
      .optional(),
    events: z
      .array(microsoft_graph_event)
      .describe('The events in the calendar. Navigation property. Read-only.')
      .optional(),
    multiValueExtendedProperties: z
      .array(microsoft_graph_multiValueLegacyExtendedProperty)
      .describe(
        'The collection of multi-value extended properties defined for the calendar. Read-only. Nullable.'
      )
      .optional(),
    singleValueExtendedProperties: z
      .array(microsoft_graph_singleValueLegacyExtendedProperty)
      .describe(
        'The collection of single-value extended properties defined for the calendar. Read-only. Nullable.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_calendarCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_calendar),
  })
  .partial()
  .passthrough();
const microsoft_graph_chatCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_chat),
  })
  .partial()
  .passthrough();
const microsoft_graph_contact = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z
      .string()
      .describe(
        "The contact's display name. You can specify the display name in a create or update operation. Note that later updates to other properties may cause an automatically generated value to overwrite the displayName value you have specified. To preserve a pre-existing value, always include it as displayName in an update operation."
      )
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    title: z.string().describe("The contact's title.").nullish(),
    singleValueExtendedProperties: z
      .array(microsoft_graph_singleValueLegacyExtendedProperty)
      .describe(
        'The collection of single-value extended properties defined for the contact. Read-only. Nullable.'
      )
      .optional(),
    multiValueExtendedProperties: z
      .array(microsoft_graph_multiValueLegacyExtendedProperty)
      .describe(
        'The collection of multi-value extended properties defined for the contact. Read-only. Nullable.'
      )
      .optional(),
    categories: z
      .array(z.string().nullable())
      .describe('The categories associated with the item')
      .optional(),
    changeKey: z
      .string()
      .describe(
        'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
      )
      .nullish(),
    assistantName: z.string().describe("The name of the contact's assistant.").nullish(),
    birthday: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "The contact's birthday. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
      )
      .nullish(),
    businessAddress: microsoft_graph_physicalAddress.optional(),
    businessHomePage: z.string().describe('The business home page of the contact.').nullish(),
    businessPhones: z
      .array(z.string().nullable())
      .describe("The contact's business phone numbers.")
      .optional(),
    children: z
      .array(z.string().nullable())
      .describe("The names of the contact's children.")
      .optional(),
    companyName: z.string().describe("The name of the contact's company.").nullish(),
    department: z.string().describe("The contact's department.").nullish(),
    emailAddresses: z
      .array(microsoft_graph_emailAddress)
      .describe("The contact's email addresses.")
      .optional(),
    fileAs: z.string().describe('The name the contact is filed under.').nullish(),
    generation: z.string().describe("The contact's suffix.").nullish(),
    givenName: z.string().describe("The contact's given name.").nullish(),
    homeAddress: microsoft_graph_physicalAddress.optional(),
    homePhones: z
      .array(z.string().nullable())
      .describe("The contact's home phone numbers.")
      .optional(),
    imAddresses: z
      .array(z.string().nullable())
      .describe("The contact's instant messaging (IM) addresses.")
      .optional(),
    initials: z.string().describe("The contact's initials.").nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_contactFolder: z.ZodType<microsoft_graph_contactFolder> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      displayName: z.string().describe("The folder's display name.").nullish(),
      parentFolderId: z.string().describe("The ID of the folder's parent folder.").nullish(),
      childFolders: z
        .array(microsoft_graph_contactFolder)
        .describe(
          'The collection of child folders in the folder. Navigation property. Read-only. Nullable.'
        )
        .optional(),
      contacts: z
        .array(microsoft_graph_contact)
        .describe('The contacts in the folder. Navigation property. Read-only. Nullable.')
        .optional(),
      multiValueExtendedProperties: z
        .array(microsoft_graph_multiValueLegacyExtendedProperty)
        .describe(
          'The collection of multi-value extended properties defined for the contactFolder. Read-only. Nullable.'
        )
        .optional(),
      singleValueExtendedProperties: z
        .array(microsoft_graph_singleValueLegacyExtendedProperty)
        .describe(
          'The collection of single-value extended properties defined for the contactFolder. Read-only. Nullable.'
        )
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_contactFolderCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_contactFolder),
  })
  .partial()
  .passthrough();
const microsoft_graph_contactCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_contact),
  })
  .partial()
  .passthrough();
const microsoft_graph_labelActionSource = z.enum([
  'manual',
  'automatic',
  'recommended',
  'none',
  'unknownFutureValue',
]);
const microsoft_graph_usageRights = z.enum([
  'unknown',
  'docEdit',
  'edit',
  'comment',
  'export',
  'forward',
  'owner',
  'print',
  'reply',
  'replyAll',
  'view',
  'extract',
  'viewRightsData',
  'editRightsData',
  'objModel',
  'accessDenied',
  'userDefinedProtectionTypeNotSupportedException',
  'encryptedProtectionTypeNotSupportedException',
  'purviewClaimsChallengeNotSupportedException',
  'exception',
  'labelNotFoundException',
  'unknownFutureValue',
]);
const microsoft_graph_usageRightsIncluded = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    ownerEmail: z.string().describe('The email of owner label rights.').nullish(),
    userEmail: z.string().describe('The email of user with label user rights.').nullish(),
    value: microsoft_graph_usageRights.optional(),
  })
  .passthrough();
const microsoft_graph_sensitivityLabel: z.ZodType<microsoft_graph_sensitivityLabel> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      actionSource: microsoft_graph_labelActionSource.optional(),
      autoTooltip: z.string().nullish(),
      description: z.string().nullish(),
      displayName: z.string().nullish(),
      hasProtection: z.boolean().nullish(),
      isDefault: z.boolean().nullish(),
      isEndpointProtectionEnabled: z.boolean().nullish(),
      isScopedToUser: z.boolean().nullish(),
      locale: z.string().nullish(),
      name: z.string().nullish(),
      priority: z.number().gte(-2147483648).lte(2147483647).nullish(),
      toolTip: z.string().nullish(),
      rights: microsoft_graph_usageRightsIncluded.optional(),
      sublabels: z.array(microsoft_graph_sensitivityLabel).optional(),
    })
    .passthrough()
);
const microsoft_graph_sensitivityLabelCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_sensitivityLabel),
  })
  .partial()
  .passthrough();
const microsoft_graph_storagePlanInformation = z
  .object({
    upgradeAvailable: z
      .boolean()
      .describe('Indicates whether there are higher storage quota plans available. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_quota = z
  .object({
    deleted: z
      .number()
      .describe('Total space consumed by files in the recycle bin, in bytes. Read-only.')
      .nullish(),
    remaining: z
      .number()
      .describe('Total space remaining before reaching the capacity limit, in bytes. Read-only.')
      .nullish(),
    state: z
      .string()
      .describe('Enumeration value that indicates the state of the storage space. Read-only.')
      .nullish(),
    storagePlanInformation: microsoft_graph_storagePlanInformation.optional(),
    total: z.number().describe('Total allowed storage space, in bytes. Read-only.').nullish(),
    used: z.number().describe('Total space used, in bytes. Read-only.').nullish(),
  })
  .passthrough();
const microsoft_graph_systemFacet = z.object({}).passthrough();
const microsoft_graph_listInfo = z
  .object({
    contentTypesEnabled: z
      .boolean()
      .describe('If true, indicates that content types are enabled for this list.')
      .nullish(),
    hidden: z
      .boolean()
      .describe(
        "If true, indicates that the list isn't normally visible in the SharePoint user experience."
      )
      .nullish(),
    template: z
      .string()
      .describe(
        'An enumerated value that represents the base list template used in creating the list. Possible values include documentLibrary, genericList, task, survey, announcements, contacts, and more.'
      )
      .nullish(),
  })
  .passthrough();
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
const microsoft_graph_booleanColumn = z.object({}).passthrough();
const microsoft_graph_calculatedColumn = z
  .object({
    format: z
      .string()
      .describe(
        'For dateTime output types, the format of the value. The possible values are: dateOnly or dateTime.'
      )
      .nullish(),
    formula: z
      .string()
      .describe('The formula used to compute the value for this column.')
      .nullish(),
    outputType: z
      .string()
      .describe(
        'The output type used to format values in this column. The possible values are: boolean, currency, dateTime, number, or text.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_choiceColumn = z
  .object({
    allowTextEntry: z
      .boolean()
      .describe("If true, allows custom values that aren't in the configured choices.")
      .nullish(),
    choices: z
      .array(z.string().nullable())
      .describe('The list of values available for this column.')
      .optional(),
    displayAs: z
      .string()
      .describe(
        'How the choices are to be presented in the UX. Must be one of checkBoxes, dropDownMenu, or radioButtons'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_contentApprovalStatusColumn = z.object({}).passthrough();
const microsoft_graph_currencyColumn = z
  .object({
    locale: z
      .string()
      .describe('Specifies the locale from which to infer the currency symbol.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_dateTimeColumn = z
  .object({
    displayAs: z
      .string()
      .describe(
        'How the value should be presented in the UX. Must be one of default, friendly, or standard. See below for more details. If unspecified, treated as default.'
      )
      .nullish(),
    format: z
      .string()
      .describe(
        'Indicates whether the value should be presented as a date only or a date and time. Must be one of dateOnly or dateTime'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_defaultColumnValue = z
  .object({
    formula: z
      .string()
      .describe('The formula used to compute the default value for the column.')
      .nullish(),
    value: z
      .string()
      .describe('The direct value to use as the default value for the column.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_geolocationColumn = z.object({}).passthrough();
const microsoft_graph_hyperlinkOrPictureColumn = z
  .object({
    isPicture: z
      .boolean()
      .describe(
        'Specifies whether the display format used for URL columns is an image or a hyperlink.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_lookupColumn = z
  .object({
    allowMultipleValues: z
      .boolean()
      .describe('Indicates whether multiple values can be selected from the source.')
      .nullish(),
    allowUnlimitedLength: z
      .boolean()
      .describe(
        'Indicates whether values in the column should be able to exceed the standard limit of 255 characters.'
      )
      .nullish(),
    columnName: z.string().describe('The name of the lookup source column.').nullish(),
    listId: z.string().describe('The unique identifier of the lookup source list.').nullish(),
    primaryLookupColumnId: z
      .string()
      .describe(
        'If specified, this column is a secondary lookup, pulling an additional field from the list item looked up by the primary lookup. Use the list item looked up by the primary as the source for the column named here.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_numberColumn = z
  .object({
    decimalPlaces: z
      .string()
      .describe(
        'How many decimal places to display. See below for information about the possible values.'
      )
      .nullish(),
    displayAs: z
      .string()
      .describe(
        'How the value should be presented in the UX. Must be one of number or percentage. If unspecified, treated as number.'
      )
      .nullish(),
    maximum: z
      .number()
      .describe('The maximum permitted value. [Simplified from 3 options]')
      .nullish(),
    minimum: z
      .number()
      .describe('The minimum permitted value. [Simplified from 3 options]')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_personOrGroupColumn = z
  .object({
    allowMultipleSelection: z
      .boolean()
      .describe('Indicates whether multiple values can be selected from the source.')
      .nullish(),
    chooseFromType: z
      .string()
      .describe(
        'Whether to allow selection of people only, or people and groups. Must be one of peopleAndGroups or peopleOnly.'
      )
      .nullish(),
    displayAs: z
      .string()
      .describe('How to display the information about the person or group chosen. See below.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_columnDefinition = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    name: z
      .string()
      .describe(
        'The API-facing name of the column as it appears in the fields on a listItem. For the user-facing name, see displayName.'
      )
      .nullish(),
    displayName: z.string().describe('The user-facing name of the column.').nullish(),
    description: z.string().describe('The user-facing description of the column.').nullish(),
    type: microsoft_graph_columnTypes.optional(),
    boolean: microsoft_graph_booleanColumn.optional(),
    calculated: microsoft_graph_calculatedColumn.optional(),
    choice: microsoft_graph_choiceColumn.optional(),
    columnGroup: z
      .string()
      .describe(
        'For site columns, the name of the group this column belongs to. Helps organize related columns.'
      )
      .nullish(),
    contentApprovalStatus: microsoft_graph_contentApprovalStatusColumn.optional(),
    currency: microsoft_graph_currencyColumn.optional(),
    dateTime: microsoft_graph_dateTimeColumn.optional(),
    defaultValue: microsoft_graph_defaultColumnValue.optional(),
    enforceUniqueValues: z
      .boolean()
      .describe('If true, no two list items may have the same value for this column.')
      .nullish(),
    geolocation: microsoft_graph_geolocationColumn.optional(),
    hidden: z
      .boolean()
      .describe('Specifies whether the column is displayed in the user interface.')
      .nullish(),
    hyperlinkOrPicture: microsoft_graph_hyperlinkOrPictureColumn.optional(),
    indexed: z
      .boolean()
      .describe('Specifies whether the column values can be used for sorting and searching.')
      .nullish(),
    isDeletable: z.boolean().describe('Indicates whether this column can be deleted.').nullish(),
    isReorderable: z
      .boolean()
      .describe('Indicates whether values in the column can be reordered. Read-only.')
      .nullish(),
    isSealed: z.boolean().describe('Specifies whether the column can be changed.').nullish(),
    lookup: microsoft_graph_lookupColumn.optional(),
    number: microsoft_graph_numberColumn.optional(),
    personOrGroup: microsoft_graph_personOrGroupColumn.optional(),
    propagateChanges: z
      .boolean()
      .describe(
        "If 'true', changes to this column will be propagated to lists that implement the column."
      )
      .nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_contentTypeInfo = z
  .object({
    id: z.string().describe('The ID of the content type.').nullish(),
    name: z.string().describe('The name of the content type.').nullish(),
  })
  .passthrough();
const microsoft_graph_documentSetContent = z
  .object({
    contentType: microsoft_graph_contentTypeInfo.optional(),
    fileName: z
      .string()
      .describe(
        'Name of the file in resource folder that should be added as a default content or a template in the document set.'
      )
      .nullish(),
    folderName: z
      .string()
      .describe(
        'Folder name in which the file will be placed when a new document set is created in the library.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_documentSet = z
  .object({
    allowedContentTypes: z
      .array(microsoft_graph_contentTypeInfo)
      .describe('Content types allowed in document set.')
      .optional(),
    defaultContents: z
      .array(microsoft_graph_documentSetContent)
      .describe('Default contents of document set.')
      .optional(),
    propagateWelcomePageChanges: z
      .boolean()
      .describe('Specifies whether to push welcome page changes to inherited content types.')
      .nullish(),
    shouldPrefixNameToFile: z
      .boolean()
      .describe('Indicates whether to add the name of the document set to each file name.')
      .nullish(),
    welcomePageUrl: z.string().describe('Welcome page absolute URL.').nullish(),
    sharedColumns: z.array(microsoft_graph_columnDefinition).optional(),
    welcomePageColumns: z.array(microsoft_graph_columnDefinition).optional(),
  })
  .passthrough();
const microsoft_graph_contentTypeOrder = z
  .object({
    default: z.boolean().describe('Indicates whether this is the default content type').nullish(),
    position: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Specifies the position in which the content type appears in the selection UI.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_columnLink = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    name: z.string().describe('The name of the column  in this content type.').nullish(),
  })
  .passthrough();
const microsoft_graph_contentType: z.ZodType<microsoft_graph_contentType> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      associatedHubsUrls: z
        .array(z.string().nullable())
        .describe(
          'List of canonical URLs for hub sites with which this content type is associated to. This will contain all hub sites where this content type is queued to be enforced or is already enforced. Enforcing a content type means that the content type is applied to the lists in the enforced sites.'
        )
        .optional(),
      description: z.string().describe('The descriptive text for the item.').nullish(),
      documentSet: microsoft_graph_documentSet.optional(),
      documentTemplate: microsoft_graph_documentSetContent.optional(),
      group: z
        .string()
        .describe(
          'The name of the group this content type belongs to. Helps organize related content types.'
        )
        .nullish(),
      hidden: z
        .boolean()
        .describe("Indicates whether the content type is hidden in the list's 'New' menu.")
        .nullish(),
      inheritedFrom: microsoft_graph_itemReference.optional(),
      isBuiltIn: z
        .boolean()
        .describe('Specifies if a content type is a built-in content type.')
        .nullish(),
      name: z.string().describe('The name of the content type.').nullish(),
      order: microsoft_graph_contentTypeOrder.optional(),
      parentId: z.string().describe('The unique identifier of the content type.').nullish(),
      propagateChanges: z
        .boolean()
        .describe(
          'If true, any changes made to the content type are pushed to inherited content types and lists that implement the content type.'
        )
        .nullish(),
      readOnly: z
        .boolean()
        .describe(
          "If true, the content type can't be modified unless this value is first set to false."
        )
        .nullish(),
      sealed: z
        .boolean()
        .describe(
          "If true, the content type can't be modified by users or through push-down operations. Only site collection administrators can seal or unseal content types."
        )
        .nullish(),
      base: microsoft_graph_contentType.optional(),
      baseTypes: z
        .array(microsoft_graph_contentType)
        .describe('The collection of content types that are ancestors of this content type.')
        .optional(),
      columnLinks: z
        .array(microsoft_graph_columnLink)
        .describe('The collection of columns that are required by this content type.')
        .optional(),
      columnPositions: z
        .array(microsoft_graph_columnDefinition)
        .describe('Column order information in a content type.')
        .optional(),
      columns: z
        .array(microsoft_graph_columnDefinition)
        .describe('The collection of column definitions for this content type.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_itemActionStat = z
  .object({
    actionCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of times the action took place. Read-only.')
      .nullish(),
    actorCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The number of distinct actors that performed the action. Read-only.')
      .nullish(),
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
      .describe('The service does not have source data before the specified time.')
      .nullish(),
    wasThrottled: z
      .boolean()
      .describe('Some data was not recorded due to excessive activity.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_accessAction = z.object({}).passthrough();
const microsoft_graph_itemActivity = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    access: microsoft_graph_accessAction.optional(),
    activityDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Details about when the activity took place. Read-only.')
      .nullish(),
    actor: microsoft_graph_identitySet.optional(),
    driveItem: microsoft_graph_driveItem
      .describe('[Note: Simplified from 45 properties to 25 most common ones]')
      .optional(),
  })
  .passthrough();
const microsoft_graph_itemActivityStat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    access: microsoft_graph_itemActionStat.optional(),
    create: microsoft_graph_itemActionStat.optional(),
    delete: microsoft_graph_itemActionStat.optional(),
    edit: microsoft_graph_itemActionStat.optional(),
    endDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('When the interval ends. Read-only.')
      .nullish(),
    incompleteData: microsoft_graph_incompleteData.optional(),
    isTrending: z
      .boolean()
      .describe("Indicates whether the item is 'trending.' Read-only.")
      .nullish(),
    move: microsoft_graph_itemActionStat.optional(),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('When the interval starts. Read-only.')
      .nullish(),
    activities: z
      .array(microsoft_graph_itemActivity)
      .describe('Exposes the itemActivities represented in this itemActivityStat resource.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_itemAnalytics = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    allTime: microsoft_graph_itemActivityStat.optional(),
    itemActivityStats: z.array(microsoft_graph_itemActivityStat).optional(),
    lastSevenDays: microsoft_graph_itemActivityStat.optional(),
  })
  .passthrough();
const microsoft_graph_fieldValueSet = z
  .object({ id: z.string().describe('The unique identifier for an entity. Read-only.').optional() })
  .passthrough();
const microsoft_graph_documentSetVersionItem = z
  .object({
    itemId: z.string().describe('The unique identifier for the item.').nullish(),
    title: z.string().describe('The title of the item.').nullish(),
    versionId: z.string().describe('The version ID of the item.').nullish(),
  })
  .passthrough();
const microsoft_graph_documentSetVersion = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    lastModifiedBy: microsoft_graph_identitySet.optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the version was last modified. Read-only.')
      .nullish(),
    publication: microsoft_graph_publicationFacet.optional(),
    fields: microsoft_graph_fieldValueSet.optional(),
    comment: z.string().describe('Comment about the captured version.').nullish(),
    createdBy: microsoft_graph_identitySet.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time when this version was created.')
      .nullish(),
    items: z
      .array(microsoft_graph_documentSetVersionItem)
      .describe('Items within the document set that are captured as part of this version.')
      .optional(),
    shouldCaptureMinorVersion: z
      .boolean()
      .describe(
        'If true, minor versions of items are also captured; otherwise, only major versions are captured. The default value is false.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_listItemVersion = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    lastModifiedBy: microsoft_graph_identitySet.optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the version was last modified. Read-only.')
      .nullish(),
    publication: microsoft_graph_publicationFacet.optional(),
    fields: microsoft_graph_fieldValueSet.optional(),
  })
  .passthrough();
const microsoft_graph_listItem = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdBy: microsoft_graph_identitySet.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time of item creation. Read-only.')
      .optional(),
    description: z
      .string()
      .describe('Provides a user-visible description of the item. Optional.')
      .nullish(),
    eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
    lastModifiedBy: microsoft_graph_identitySet.optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the item was last modified. Read-only.')
      .optional(),
    name: z.string().describe('The name of the item. Read-write.').nullish(),
    parentReference: microsoft_graph_itemReference.optional(),
    webUrl: z
      .string()
      .describe(
        'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
      )
      .nullish(),
    createdByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
    lastModifiedByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
    contentType: microsoft_graph_contentTypeInfo.optional(),
    deleted: microsoft_graph_deleted.optional(),
    sharepointIds: microsoft_graph_sharepointIds.optional(),
    analytics: microsoft_graph_itemAnalytics.optional(),
    documentSetVersions: z
      .array(microsoft_graph_documentSetVersion)
      .describe('Version information for a document set version created by a user.')
      .optional(),
    driveItem: microsoft_graph_driveItem
      .describe('[Note: Simplified from 45 properties to 25 most common ones]')
      .optional(),
    fields: microsoft_graph_fieldValueSet.optional(),
    versions: z
      .array(microsoft_graph_listItemVersion)
      .describe('The list of previous versions of the list item.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_longRunningOperationStatus = z.enum([
  'notStarted',
  'running',
  'succeeded',
  'failed',
  'unknownFutureValue',
]);
const microsoft_graph_publicErrorDetail = z
  .object({
    code: z.string().describe('The error code.').nullish(),
    message: z.string().describe('The error message.').nullish(),
    target: z.string().describe('The target of the error.').nullish(),
  })
  .passthrough();
const microsoft_graph_publicInnerError = z
  .object({
    code: z.string().describe('The error code.').nullish(),
    details: z
      .array(microsoft_graph_publicErrorDetail)
      .describe('A collection of error details.')
      .optional(),
    message: z.string().describe('The error message.').nullish(),
    target: z.string().describe('The target of the error.').nullish(),
  })
  .passthrough();
const microsoft_graph_publicError = z
  .object({
    code: z.string().describe('Represents the error code.').nullish(),
    details: z
      .array(microsoft_graph_publicErrorDetail)
      .describe('Details of the error.')
      .optional(),
    innerError: microsoft_graph_publicInnerError.optional(),
    message: z.string().describe('A non-localized message for the developer.').nullish(),
    target: z.string().describe('The target of the error.').nullish(),
  })
  .passthrough();
const microsoft_graph_richLongRunningOperation = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The start time of the operation. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    lastActionDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The time of the last action in the operation. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    resourceLocation: z
      .string()
      .describe('URI of the resource that the operation is performed on.')
      .nullish(),
    status: microsoft_graph_longRunningOperationStatus.optional(),
    statusDetail: z.string().describe('Details about the status of the operation.').nullish(),
    error: microsoft_graph_publicError.optional(),
    percentageComplete: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('A value between 0 and 100 that indicates the progress of the operation.')
      .nullish(),
    resourceId: z.string().describe('The unique identifier for the result.').nullish(),
    type: z.string().describe('The type of the operation.').nullish(),
  })
  .passthrough();
const microsoft_graph_subscription = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    applicationId: z
      .string()
      .describe(
        'Optional. Identifier of the application used to create the subscription. Read-only.'
      )
      .nullish(),
    changeType: z
      .string()
      .describe(
        'Required. Indicates the type of change in the subscribed resource that raises a change notification. The supported values are: created, updated, deleted. Multiple values can be combined using a comma-separated list. Note:  Drive root item and list change notifications support only the updated changeType. User and group change notifications support updated and deleted changeType. Use updated to receive notifications when user or group is created, updated, or soft deleted. Use deleted to receive notifications when user or group is permanently deleted.'
      )
      .optional(),
    clientState: z
      .string()
      .describe(
        'Optional. Specifies the value of the clientState property sent by the service in each change notification. The maximum length is 128 characters. The client can check that the change notification came from the service by comparing the value of the clientState property sent with the subscription with the value of the clientState property received with each change notification.'
      )
      .nullish(),
    creatorId: z
      .string()
      .describe(
        'Optional. Identifier of the user or service principal that created the subscription. If the app used delegated permissions to create the subscription, this field contains the ID of the signed-in user the app called on behalf of. If the app used application permissions, this field contains the ID of the service principal corresponding to the app. Read-only.'
      )
      .nullish(),
    encryptionCertificate: z
      .string()
      .describe(
        'Optional. A base64-encoded representation of a certificate with a public key used to encrypt resource data in change notifications. Optional but required when includeResourceData is true.'
      )
      .nullish(),
    encryptionCertificateId: z
      .string()
      .describe(
        'Optional. A custom app-provided identifier to help identify the certificate needed to decrypt resource data.'
      )
      .nullish(),
    expirationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Required. Specifies the date and time when the webhook subscription expires. The time is in UTC, and can be an amount of time from subscription creation that varies for the resource subscribed to. Any value under 45 minutes after the time of the request is automatically set to 45 minutes after the request time. For the maximum supported subscription length of time, see Subscription lifetime.'
      )
      .optional(),
    includeResourceData: z
      .boolean()
      .describe(
        'Optional. When set to true, change notifications include resource data (such as content of a chat message).'
      )
      .nullish(),
    latestSupportedTlsVersion: z
      .string()
      .describe(
        'Optional. Specifies the latest version of Transport Layer Security (TLS) that the notification endpoint, specified by notificationUrl, supports. The possible values are: v10, v11, v12, v13. For subscribers whose notification endpoint supports a version lower than the currently recommended version (TLS 1.2), specifying this property by a set timeline allows them to temporarily use their deprecated version of TLS before completing their upgrade to TLS 1.2. For these subscribers, not setting this property per the timeline would result in subscription operations failing. For subscribers whose notification endpoint already supports TLS 1.2, setting this property is optional. In such cases, Microsoft Graph defaults the property to v1_2.'
      )
      .nullish(),
    lifecycleNotificationUrl: z
      .string()
      .describe(
        'Required for Teams resources if  the expirationDateTime value is more than 1 hour from now; optional otherwise. The URL of the endpoint that receives lifecycle notifications, including subscriptionRemoved, reauthorizationRequired, and missed notifications. This URL must make use of the HTTPS protocol. For more information, see Reduce missing subscriptions and change notifications.'
      )
      .nullish(),
    notificationQueryOptions: z
      .string()
      .describe(
        'Optional. OData query options for specifying value for the targeting resource. Clients receive notifications when resource reaches the state matching the query options provided here. With this new property in the subscription creation payload along with all existing properties, Webhooks deliver notifications whenever a resource reaches the desired state mentioned in the notificationQueryOptions property. For example, when the print job is completed or when a print job resource isFetchable property value becomes true etc.  Supported only for Universal Print Service. For more information, see Subscribe to change notifications from cloud printing APIs using Microsoft Graph.'
      )
      .nullish(),
    notificationUrl: z
      .string()
      .describe(
        'Required. The URL of the endpoint that receives the change notifications. This URL must make use of the HTTPS protocol. Any query string parameter included in the notificationUrl property is included in the HTTP POST request when Microsoft Graph sends the change notifications.'
      )
      .optional(),
    notificationUrlAppId: z
      .string()
      .describe(
        'Optional. The app ID that the subscription service can use to generate the validation token. The value allows the client to validate the authenticity of the notification received.'
      )
      .nullish(),
    resource: z
      .string()
      .describe(
        "Required. Specifies the resource that is monitored for changes. Don't include the base URL (https://graph.microsoft.com/v1.0/). See the possible resource path values for each supported resource."
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_list: z.ZodType<microsoft_graph_list> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      createdBy: microsoft_graph_identitySet.optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time of item creation. Read-only.')
        .optional(),
      description: z
        .string()
        .describe('Provides a user-visible description of the item. Optional.')
        .nullish(),
      eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
      lastModifiedBy: microsoft_graph_identitySet.optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time the item was last modified. Read-only.')
        .optional(),
      name: z.string().describe('The name of the item. Read-write.').nullish(),
      parentReference: microsoft_graph_itemReference.optional(),
      webUrl: z
        .string()
        .describe(
          'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
        )
        .nullish(),
      createdByUser: microsoft_graph_user
        .describe('[Note: Simplified from 136 properties to 25 most common ones]')
        .optional(),
      lastModifiedByUser: microsoft_graph_user
        .describe('[Note: Simplified from 136 properties to 25 most common ones]')
        .optional(),
      displayName: z.string().describe('The displayable title of the list.').nullish(),
      list: microsoft_graph_listInfo.optional(),
      sharepointIds: microsoft_graph_sharepointIds.optional(),
      system: microsoft_graph_systemFacet.optional(),
      columns: z
        .array(microsoft_graph_columnDefinition)
        .describe('The collection of field definitions for this list.')
        .optional(),
      contentTypes: z
        .array(microsoft_graph_contentType)
        .describe('The collection of content types present in this list.')
        .optional(),
      drive: microsoft_graph_drive.optional(),
      items: z
        .array(microsoft_graph_listItem)
        .describe('All items contained in the list.')
        .optional(),
      operations: z
        .array(microsoft_graph_richLongRunningOperation)
        .describe('The collection of long-running operations on the list.')
        .optional(),
      subscriptions: z
        .array(microsoft_graph_subscription)
        .describe('The set of subscriptions on the list.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_drive: z.ZodType<microsoft_graph_drive> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      createdBy: microsoft_graph_identitySet.optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time of item creation. Read-only.')
        .optional(),
      description: z
        .string()
        .describe('Provides a user-visible description of the item. Optional.')
        .nullish(),
      eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
      lastModifiedBy: microsoft_graph_identitySet.optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Date and time the item was last modified. Read-only.')
        .optional(),
      name: z.string().describe('The name of the item. Read-write.').nullish(),
      parentReference: microsoft_graph_itemReference.optional(),
      webUrl: z
        .string()
        .describe(
          'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
        )
        .nullish(),
      createdByUser: microsoft_graph_user
        .describe('[Note: Simplified from 136 properties to 25 most common ones]')
        .optional(),
      lastModifiedByUser: microsoft_graph_user
        .describe('[Note: Simplified from 136 properties to 25 most common ones]')
        .optional(),
      driveType: z
        .string()
        .describe(
          'Describes the type of drive represented by this resource. OneDrive personal drives return personal. OneDrive for Business returns business. SharePoint document libraries return documentLibrary. Read-only.'
        )
        .nullish(),
      owner: microsoft_graph_identitySet.optional(),
      quota: microsoft_graph_quota.optional(),
      sharePointIds: microsoft_graph_sharepointIds.optional(),
      system: microsoft_graph_systemFacet.optional(),
      bundles: z
        .array(microsoft_graph_driveItem)
        .describe(
          'Collection of bundles (albums and multi-select-shared sets of items). Only in personal OneDrive.'
        )
        .optional(),
      following: z
        .array(microsoft_graph_driveItem)
        .describe('The list of items the user is following. Only in OneDrive for Business.')
        .optional(),
      items: z
        .array(microsoft_graph_driveItem)
        .describe('All items contained in the drive. Read-only. Nullable.')
        .optional(),
      list: microsoft_graph_list.optional(),
      root: microsoft_graph_driveItem
        .describe('[Note: Simplified from 45 properties to 25 most common ones]')
        .optional(),
      special: z
        .array(microsoft_graph_driveItem)
        .describe('Collection of common folders available in OneDrive. Read-only. Nullable.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_driveCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_drive),
  })
  .partial()
  .passthrough();
const accept_calendar_event_Body = z
  .object({ SendResponse: z.boolean().nullable().default(false), Comment: z.string().nullable() })
  .partial()
  .passthrough();
const decline_calendar_event_Body = z
  .object({
    ProposedNewTime: z.union([microsoft_graph_timeSlot, z.object({}).partial().passthrough()]),
    SendResponse: z.boolean().nullable().default(false),
    Comment: z.string().nullable(),
  })
  .partial()
  .passthrough();
const forward_calendar_event_Body = z
  .object({ ToRecipients: z.array(microsoft_graph_recipient), Comment: z.string().nullable() })
  .partial()
  .passthrough();
const snooze_calendar_event_reminder_Body = z
  .object({ NewReminderTime: microsoft_graph_dateTimeTimeZone })
  .partial()
  .passthrough();
const microsoft_graph_inferenceClassificationType = z.enum(['focused', 'other']);
const microsoft_graph_inferenceClassificationOverride = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    classifyAs: microsoft_graph_inferenceClassificationType.optional(),
    senderEmailAddress: microsoft_graph_emailAddress.optional(),
  })
  .passthrough();
const microsoft_graph_inferenceClassificationOverrideCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_inferenceClassificationOverride),
  })
  .partial()
  .passthrough();
const microsoft_graph_resourceReference = z
  .object({
    id: z.string().describe("The item's unique identifier.").nullish(),
    type: z
      .string()
      .describe(
        "A string value that can be used to classify the item, such as 'microsoft.graph.driveItem'"
      )
      .nullish(),
    webUrl: z.string().describe('A URL leading to the referenced item.').nullish(),
  })
  .passthrough();
const microsoft_graph_resourceVisualization = z
  .object({
    containerDisplayName: z
      .string()
      .describe(
        'A string describing where the item is stored. For example, the name of a SharePoint site or the user name identifying the owner of the OneDrive storing the item.'
      )
      .nullish(),
    containerType: z
      .string()
      .describe(
        'Can be used for filtering by the type of container in which the file is stored. Such as Site or OneDriveBusiness.'
      )
      .nullish(),
    containerWebUrl: z
      .string()
      .describe('A path leading to the folder in which the item is stored.')
      .nullish(),
    mediaType: z
      .string()
      .describe(
        "The item's media type. Can be used for filtering for a specific type of file based on supported IANA Media Mime Types. Not all Media Mime Types are supported."
      )
      .nullish(),
    previewImageUrl: z
      .string()
      .describe('A URL leading to the preview image for the item.')
      .nullish(),
    previewText: z.string().describe('A preview text for the item.').nullish(),
    title: z.string().describe("The item's title text.").nullish(),
    type: z
      .string()
      .describe(
        "The item's media type. Can be used for filtering for a specific file based on a specific type. See the section Type property values for supported types."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_entity = z
  .object({ id: z.string().describe('The unique identifier for an entity. Read-only.').optional() })
  .passthrough();
const microsoft_graph_trending = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    resourceReference: microsoft_graph_resourceReference.optional(),
    resourceVisualization: microsoft_graph_resourceVisualization.optional(),
    weight: z
      .number()
      .describe(
        'Value indicating how much the document is currently trending. The larger the number, the more the document is currently trending around the user (the more relevant it is). Returned documents are sorted by this value. [Simplified from 3 options]'
      )
      .nullish(),
    resource: microsoft_graph_entity.optional(),
  })
  .passthrough();
const microsoft_graph_trendingCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_trending),
  })
  .partial()
  .passthrough();
const microsoft_graph_giphyRatingType = z.enum(['strict', 'moderate', 'unknownFutureValue']);
const microsoft_graph_teamFunSettings = z
  .object({
    allowCustomMemes: z
      .boolean()
      .describe('If set to true, enables users to include custom memes.')
      .nullish(),
    allowGiphy: z.boolean().describe('If set to true, enables Giphy use.').nullish(),
    allowStickersAndMemes: z
      .boolean()
      .describe('If set to true, enables users to include stickers and memes.')
      .nullish(),
    giphyContentRating: microsoft_graph_giphyRatingType.optional(),
  })
  .passthrough();
const microsoft_graph_teamGuestSettings = z
  .object({
    allowCreateUpdateChannels: z
      .boolean()
      .describe('If set to true, guests can add and update channels.')
      .nullish(),
    allowDeleteChannels: z
      .boolean()
      .describe('If set to true, guests can delete channels.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_teamMemberSettings = z
  .object({
    allowAddRemoveApps: z
      .boolean()
      .describe('If set to true, members can add and remove apps.')
      .nullish(),
    allowCreatePrivateChannels: z
      .boolean()
      .describe('If set to true, members can add and update private channels.')
      .nullish(),
    allowCreateUpdateChannels: z
      .boolean()
      .describe('If set to true, members can add and update channels.')
      .nullish(),
    allowCreateUpdateRemoveConnectors: z
      .boolean()
      .describe('If set to true, members can add, update, and remove connectors.')
      .nullish(),
    allowCreateUpdateRemoveTabs: z
      .boolean()
      .describe('If set to true, members can add, update, and remove tabs.')
      .nullish(),
    allowDeleteChannels: z
      .boolean()
      .describe('If set to true, members can delete channels.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_teamMessagingSettings = z
  .object({
    allowChannelMentions: z
      .boolean()
      .describe('If set to true, @channel mentions are allowed.')
      .nullish(),
    allowOwnerDeleteMessages: z
      .boolean()
      .describe('If set to true, owners can delete any message.')
      .nullish(),
    allowTeamMentions: z
      .boolean()
      .describe('If set to true, @team mentions are allowed.')
      .nullish(),
    allowUserDeleteMessages: z
      .boolean()
      .describe('If set to true, users can delete their messages.')
      .nullish(),
    allowUserEditMessages: z
      .boolean()
      .describe('If set to true, users can edit their messages.')
      .nullish(),
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
    guestsCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of guests in a team.')
      .nullish(),
    membersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of members in a team.')
      .nullish(),
    ownersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of owners in a team.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_teamVisibilityType = z.enum([
  'private',
  'public',
  'hiddenMembership',
  'unknownFutureValue',
]);
const microsoft_graph_channelLayoutType = z.enum(['post', 'chat', 'unknownFutureValue']);
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
      .nullish(),
    hasMembersFromOtherTenants: z
      .boolean()
      .describe('Indicates whether external members are included on the channel.')
      .nullish(),
    membersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of members in a channel.')
      .nullish(),
    ownersCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Count of owners in a channel.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_sharedWithChannelTeamInfo: z.ZodType<microsoft_graph_sharedWithChannelTeamInfo> =
  z.lazy(() =>
    z
      .object({
        id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
        displayName: z.string().describe('The name of the team.').nullish(),
        tenantId: z.string().describe('The ID of the Microsoft Entra tenant.').nullish(),
        team: microsoft_graph_team
          .describe('[Note: Simplified from 30 properties to 25 most common ones]')
          .optional(),
        isHostTeam: z
          .boolean()
          .describe('Indicates whether the team is the host of the channel.')
          .nullish(),
        allowedMembers: z
          .array(microsoft_graph_conversationMember)
          .describe('A collection of team members who have access to the shared channel.')
          .optional(),
      })
      .passthrough()
  );
const microsoft_graph_channel: z.ZodType<microsoft_graph_channel> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Read only. Timestamp at which the channel was created.')
        .nullish(),
      description: z.string().describe('Optional textual description for the channel.').nullish(),
      displayName: z
        .string()
        .describe(
          'Channel name as it will appear to the user in Microsoft Teams. The maximum length is 50 characters.'
        )
        .optional(),
      email: z
        .string()
        .describe('The email address for sending messages to the channel. Read-only.')
        .nullish(),
      isArchived: z
        .boolean()
        .describe('Indicates whether the channel is archived. Read-only.')
        .nullish(),
      isFavoriteByDefault: z
        .boolean()
        .describe(
          'Indicates whether the channel should be marked as recommended for all members of the team to show in their channel list. Note: All recommended channels automatically show in the channels list for education and frontline worker users. The property can only be set programmatically via the Create team method. The default value is false.'
        )
        .nullish(),
      layoutType: microsoft_graph_channelLayoutType.optional(),
      membershipType: microsoft_graph_channelMembershipType.optional(),
      migrationMode: microsoft_graph_migrationMode.optional(),
      originalCreatedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'Timestamp of the original creation time for the channel. The value is null if the channel never entered migration mode.'
        )
        .nullish(),
      summary: microsoft_graph_channelSummary.optional(),
      tenantId: z.string().describe('The ID of the Microsoft Entra tenant.').nullish(),
      webUrl: z
        .string()
        .describe(
          'A hyperlink that will go to the channel in Microsoft Teams. This is the URL that you get when you right-click a channel in Microsoft Teams and select Get link to channel. This URL should be treated as an opaque blob, and not parsed. Read-only.'
        )
        .nullish(),
      allMembers: z
        .array(microsoft_graph_conversationMember)
        .describe(
          'A collection of membership records associated with the channel, including both direct and indirect members of shared channels.'
        )
        .optional(),
      enabledApps: z
        .array(microsoft_graph_teamsApp)
        .describe('A collection of enabled apps in the channel.')
        .optional(),
      filesFolder: microsoft_graph_driveItem
        .describe('[Note: Simplified from 45 properties to 25 most common ones]')
        .optional(),
      members: z
        .array(microsoft_graph_conversationMember)
        .describe('A collection of membership records associated with the channel.')
        .optional(),
      messages: z
        .array(microsoft_graph_chatMessage)
        .describe(
          'A collection of all the messages in the channel. A navigation property. Nullable.'
        )
        .optional(),
      sharedWithTeams: z
        .array(microsoft_graph_sharedWithChannelTeamInfo)
        .describe('A collection of teams with which a channel is shared.')
        .optional(),
      tabs: z
        .array(microsoft_graph_teamsTab)
        .describe('A collection of all the tabs in the channel. A navigation property.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_operationError = z
  .object({
    code: z.string().describe('Operation error code.').nullish(),
    message: z.string().describe('Operation error message.').nullish(),
  })
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
const microsoft_graph_teamsAsyncOperation = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    attemptsCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'Number of times the operation was attempted before being marked successful or failed.'
      )
      .optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Time when the operation was created.')
      .optional(),
    error: microsoft_graph_operationError.optional(),
    lastActionDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Time when the async operation was last updated.')
      .optional(),
    operationType: microsoft_graph_teamsAsyncOperationType.optional(),
    status: microsoft_graph_teamsAsyncOperationStatus.optional(),
    targetResourceId: z
      .string()
      .describe(
        "The ID of the object that's created or modified as result of this async operation, typically a team."
      )
      .nullish(),
    targetResourceLocation: z
      .string()
      .describe(
        "The location of the object that's created or modified as result of this async operation. This URL should be treated as an opaque value and not parsed into its component paths."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_team: z.ZodType<microsoft_graph_team> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      displayName: z.string().describe('The name of the team.').nullish(),
      description: z
        .string()
        .describe('An optional description for the team. Maximum length: 1,024 characters.')
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe('Timestamp at which the team was created.')
        .nullish(),
      classification: z
        .string()
        .describe(
          "An optional label. Typically describes the data or business sensitivity of the team. Must match one of a preconfigured set in the tenant's directory."
        )
        .nullish(),
      firstChannelName: z
        .string()
        .describe(
          "The name of the first channel in the team. This is an optional property, only used during team creation and isn't returned in methods to get and list teams."
        )
        .nullish(),
      funSettings: microsoft_graph_teamFunSettings.optional(),
      guestSettings: microsoft_graph_teamGuestSettings.optional(),
      internalId: z
        .string()
        .describe(
          'A unique ID for the team that was used in a few places such as the audit log/Office 365 Management Activity API.'
        )
        .nullish(),
      isArchived: z.boolean().describe('Whether this team is in read-only mode.').nullish(),
      memberSettings: microsoft_graph_teamMemberSettings.optional(),
      messagingSettings: microsoft_graph_teamMessagingSettings.optional(),
      specialization: microsoft_graph_teamSpecialization.optional(),
      summary: microsoft_graph_teamSummary.optional(),
      tenantId: z.string().describe('The ID of the Microsoft Entra tenant.').nullish(),
      visibility: microsoft_graph_teamVisibilityType.optional(),
      webUrl: z
        .string()
        .describe(
          'A hyperlink that goes to the team in the Microsoft Teams client. You get this URL when you right-click a team in the Microsoft Teams client and select Get link to team. This URL should be treated as an opaque blob, and not parsed.'
        )
        .nullish(),
      allChannels: z
        .array(microsoft_graph_channel)
        .describe('List of channels either hosted in or shared with the team (incoming channels).')
        .optional(),
      channels: z
        .array(microsoft_graph_channel)
        .describe('The collection of channels and messages associated with the team.')
        .optional(),
      group: microsoft_graph_group
        .describe('[Note: Simplified from 75 properties to 25 most common ones]')
        .optional(),
      incomingChannels: z
        .array(microsoft_graph_channel)
        .describe('List of channels shared with the team.')
        .optional(),
      installedApps: z
        .array(microsoft_graph_teamsAppInstallation)
        .describe('The apps installed in this team.')
        .optional(),
      members: z
        .array(microsoft_graph_conversationMember)
        .describe('Members and owners of the team.')
        .optional(),
      operations: z
        .array(microsoft_graph_teamsAsyncOperation)
        .describe('The async operations that ran or are running on this team.')
        .optional(),
      permissionGrants: z
        .array(microsoft_graph_resourceSpecificPermissionGrant)
        .describe('A collection of permissions granted to apps to access the team.')
        .optional(),
    })
    .passthrough()
    .passthrough()
);
const microsoft_graph_teamCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_team),
  })
  .partial()
  .passthrough();
const microsoft_graph_externalAudienceScope = z.enum(['none', 'contactsOnly', 'all']);
const microsoft_graph_automaticRepliesStatus = z.enum(['disabled', 'alwaysEnabled', 'scheduled']);
const microsoft_graph_automaticRepliesSetting = z
  .object({
    externalAudience: microsoft_graph_externalAudienceScope.optional(),
    externalReplyMessage: z
      .string()
      .describe(
        'The automatic reply to send to the specified external audience, if Status is AlwaysEnabled or Scheduled.'
      )
      .nullish(),
    internalReplyMessage: z
      .string()
      .describe(
        "The automatic reply to send to the audience internal to the signed-in user's organization, if Status is AlwaysEnabled or Scheduled."
      )
      .nullish(),
    scheduledEndDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    scheduledStartDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    status: microsoft_graph_automaticRepliesStatus.optional(),
  })
  .passthrough();
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
      .nullish(),
    locale: z
      .string()
      .describe(
        "A locale representation for the user, which includes the user's preferred language and country/region. For example, 'en-us'. The language component follows 2-letter codes as defined in ISO 639-1, and the country component follows 2-letter codes as defined in ISO 3166-1 alpha-2."
      )
      .nullish(),
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
const microsoft_graph_mailboxSettings = z
  .object({
    archiveFolder: z.string().describe('Folder ID of an archive folder for the user.').nullish(),
    automaticRepliesSetting: microsoft_graph_automaticRepliesSetting.optional(),
    dateFormat: z.string().describe("The date format for the user's mailbox.").nullish(),
    delegateMeetingMessageDeliveryOptions:
      microsoft_graph_delegateMeetingMessageDeliveryOptions.optional(),
    language: microsoft_graph_localeInfo.optional(),
    timeFormat: z.string().describe("The time format for the user's mailbox.").nullish(),
    timeZone: z.string().describe("The default time zone for the user's mailbox.").nullish(),
    userPurpose: microsoft_graph_userPurpose.optional(),
    workingHours: microsoft_graph_workingHours.optional(),
  })
  .passthrough();
const microsoft_graph_messageRuleActions = z
  .object({
    assignCategories: z
      .array(z.string().nullable())
      .describe('A list of categories to be assigned to a message.')
      .optional(),
    copyToFolder: z
      .string()
      .describe('The ID of a folder that a message is to be copied to.')
      .nullish(),
    delete: z
      .boolean()
      .describe('Indicates whether a message should be moved to the Deleted Items folder.')
      .nullish(),
    forwardAsAttachmentTo: z
      .array(microsoft_graph_recipient)
      .describe(
        'The email addresses of the recipients to which a message should be forwarded as an attachment.'
      )
      .optional(),
    forwardTo: z
      .array(microsoft_graph_recipient)
      .describe('The email addresses of the recipients to which a message should be forwarded.')
      .optional(),
    markAsRead: z
      .boolean()
      .describe('Indicates whether a message should be marked as read.')
      .nullish(),
    markImportance: microsoft_graph_importance.optional(),
    moveToFolder: z
      .string()
      .describe('The ID of the folder that a message will be moved to.')
      .nullish(),
    permanentDelete: z
      .boolean()
      .describe(
        'Indicates whether a message should be permanently deleted and not saved to the Deleted Items folder.'
      )
      .nullish(),
    redirectTo: z
      .array(microsoft_graph_recipient)
      .describe('The email addresses to which a message should be redirected.')
      .optional(),
    stopProcessingRules: z
      .boolean()
      .describe('Indicates whether subsequent rules should be evaluated.')
      .nullish(),
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
const microsoft_graph_messageRulePredicates = z
  .object({
    sensitivity: microsoft_graph_sensitivity.optional(),
    importance: microsoft_graph_importance.optional(),
    bodyContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that should appear in the body of an incoming message in order for the condition or exception to apply.'
      )
      .optional(),
    bodyOrSubjectContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that should appear in the body or subject of an incoming message in order for the condition or exception to apply.'
      )
      .optional(),
    categories: z
      .array(z.string().nullable())
      .describe(
        'Represents the categories that an incoming message should be labeled with in order for the condition or exception to apply.'
      )
      .optional(),
    fromAddresses: z
      .array(microsoft_graph_recipient)
      .describe(
        'Represents the specific sender email addresses of an incoming message in order for the condition or exception to apply.'
      )
      .optional(),
    hasAttachments: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must have attachments in order for the condition or exception to apply.'
      )
      .nullish(),
    headerContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that appear in the headers of an incoming message in order for the condition or exception to apply.'
      )
      .optional(),
    isApprovalRequest: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be an approval request in order for the condition or exception to apply.'
      )
      .nullish(),
    isAutomaticForward: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be automatically forwarded in order for the condition or exception to apply.'
      )
      .nullish(),
    isAutomaticReply: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be an auto reply in order for the condition or exception to apply.'
      )
      .nullish(),
    isEncrypted: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be encrypted in order for the condition or exception to apply.'
      )
      .nullish(),
    isMeetingRequest: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a meeting request in order for the condition or exception to apply.'
      )
      .nullish(),
    isMeetingResponse: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a meeting response in order for the condition or exception to apply.'
      )
      .nullish(),
    isNonDeliveryReport: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a non-delivery report in order for the condition or exception to apply.'
      )
      .nullish(),
    isPermissionControlled: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be permission controlled (RMS-protected) in order for the condition or exception to apply.'
      )
      .nullish(),
    isReadReceipt: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a read receipt in order for the condition or exception to apply.'
      )
      .nullish(),
    isSigned: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be S/MIME-signed in order for the condition or exception to apply.'
      )
      .nullish(),
    isVoicemail: z
      .boolean()
      .describe(
        'Indicates whether an incoming message must be a voice mail in order for the condition or exception to apply.'
      )
      .nullish(),
    messageActionFlag: microsoft_graph_messageActionFlag.optional(),
    notSentToMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must not be a recipient of an incoming message in order for the condition or exception to apply.'
      )
      .nullish(),
    recipientContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that appear in either the toRecipients or ccRecipients properties of an incoming message in order for the condition or exception to apply.'
      )
      .optional(),
    senderContains: z
      .array(z.string().nullable())
      .describe(
        'Represents the strings that appear in the from property of an incoming message in order for the condition or exception to apply.'
      )
      .optional(),
    sentCcMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must be in the ccRecipients property of an incoming message in order for the condition or exception to apply.'
      )
      .nullish(),
    sentOnlyToMe: z
      .boolean()
      .describe(
        'Indicates whether the owner of the mailbox must be the only recipient in an incoming message in order for the condition or exception to apply.'
      )
      .nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_messageRule = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    actions: microsoft_graph_messageRuleActions.optional(),
    conditions: microsoft_graph_messageRulePredicates
      .describe('[Note: Simplified from 30 properties to 25 most common ones]')
      .optional(),
    displayName: z.string().describe('The display name of the rule.').nullish(),
    exceptions: microsoft_graph_messageRulePredicates
      .describe('[Note: Simplified from 30 properties to 25 most common ones]')
      .optional(),
    hasError: z
      .boolean()
      .describe('Indicates whether the rule is in an error condition. Read-only.')
      .nullish(),
    isEnabled: z
      .boolean()
      .describe('Indicates whether the rule is enabled to be applied to messages.')
      .nullish(),
    isReadOnly: z
      .boolean()
      .describe(
        'Indicates if the rule is read-only and cannot be modified or deleted by the rules REST API.'
      )
      .nullish(),
    sequence: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Indicates the order in which the rule is executed, among other rules.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_followupFlagStatus = z.enum(['notFlagged', 'complete', 'flagged']);
const microsoft_graph_followupFlag = z
  .object({
    completedDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    dueDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    flagStatus: microsoft_graph_followupFlagStatus.optional(),
    startDateTime: microsoft_graph_dateTimeTimeZone.optional(),
  })
  .passthrough();
const microsoft_graph_internetMessageHeader = z
  .object({
    name: z.string().describe('Represents the key in a key-value pair.').nullish(),
    value: z.string().describe('The value in a key-value pair.').nullish(),
  })
  .passthrough();
const microsoft_graph_message = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    body: microsoft_graph_itemBody.optional(),
    subject: z.string().describe('The subject of the message.').nullish(),
    attachments: z
      .array(microsoft_graph_attachment)
      .describe('The fileAttachment and itemAttachment attachments for the message.')
      .optional(),
    singleValueExtendedProperties: z
      .array(microsoft_graph_singleValueLegacyExtendedProperty)
      .describe(
        'The collection of single-value extended properties defined for the message. Nullable.'
      )
      .optional(),
    multiValueExtendedProperties: z
      .array(microsoft_graph_multiValueLegacyExtendedProperty)
      .describe(
        'The collection of multi-value extended properties defined for the message. Nullable.'
      )
      .optional(),
    importance: microsoft_graph_importance.optional(),
    from: microsoft_graph_recipient.optional(),
    toRecipients: z
      .array(microsoft_graph_recipient)
      .describe('The To: recipients for the message.')
      .optional(),
    categories: z
      .array(z.string().nullable())
      .describe('The categories associated with the item')
      .optional(),
    changeKey: z
      .string()
      .describe(
        'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
      )
      .nullish(),
    bccRecipients: z
      .array(microsoft_graph_recipient)
      .describe('The Bcc: recipients for the message.')
      .optional(),
    bodyPreview: z
      .string()
      .describe('The first 255 characters of the message body. It is in text format.')
      .nullish(),
    ccRecipients: z
      .array(microsoft_graph_recipient)
      .describe('The Cc: recipients for the message.')
      .optional(),
    conversationId: z
      .string()
      .describe('The ID of the conversation the email belongs to.')
      .nullish(),
    conversationIndex: z
      .string()
      .describe('Indicates the position of the message within the conversation.')
      .nullish(),
    flag: microsoft_graph_followupFlag.optional(),
    hasAttachments: z
      .boolean()
      .describe(
        "Indicates whether the message has attachments. This property doesn't include inline attachments, so if a message contains only inline attachments, this property is false. To verify the existence of inline attachments, parse the body property to look for a src attribute, such as <IMG src='cid:image001.jpg@01D26CD8.6C05F070'>."
      )
      .nullish(),
    inferenceClassification: microsoft_graph_inferenceClassificationType.optional(),
    internetMessageHeaders: z
      .array(microsoft_graph_internetMessageHeader)
      .describe(
        'A collection of message headers defined by RFC5322. The set includes message headers indicating the network path taken by a message from the sender to the recipient. It can also contain custom message headers that hold app data for the message.  Requires $select to retrieve. Read-only.'
      )
      .optional(),
    internetMessageId: z
      .string()
      .describe('The message ID in the format specified by RFC2822.')
      .nullish(),
    isDeliveryReceiptRequested: z
      .boolean()
      .describe('Indicates whether a read receipt is requested for the message.')
      .nullish(),
    isDraft: z
      .boolean()
      .describe(
        "Indicates whether the message is a draft. A message is a draft if it hasn't been sent yet."
      )
      .nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_mailFolder: z.ZodType<microsoft_graph_mailFolder> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      childFolderCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The number of immediate child mailFolders in the current mailFolder.')
        .nullish(),
      displayName: z.string().describe("The mailFolder's display name.").nullish(),
      isHidden: z
        .boolean()
        .describe(
          'Indicates whether the mailFolder is hidden. This property can be set only when creating the folder. Find more information in Hidden mail folders.'
        )
        .nullish(),
      parentFolderId: z
        .string()
        .describe("The unique identifier for the mailFolder's parent mailFolder.")
        .nullish(),
      totalItemCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The number of items in the mailFolder.')
        .nullish(),
      unreadItemCount: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The number of items in the mailFolder marked as unread.')
        .nullish(),
      childFolders: z
        .array(microsoft_graph_mailFolder)
        .describe('The collection of child folders in the mailFolder.')
        .optional(),
      messageRules: z
        .array(microsoft_graph_messageRule)
        .describe("The collection of rules that apply to the user's Inbox folder.")
        .optional(),
      messages: z
        .array(microsoft_graph_message)
        .describe('The collection of messages in the mailFolder.')
        .optional(),
      multiValueExtendedProperties: z
        .array(microsoft_graph_multiValueLegacyExtendedProperty)
        .describe(
          'The collection of multi-value extended properties defined for the mailFolder. Read-only. Nullable.'
        )
        .optional(),
      singleValueExtendedProperties: z
        .array(microsoft_graph_singleValueLegacyExtendedProperty)
        .describe(
          'The collection of single-value extended properties defined for the mailFolder. Read-only. Nullable.'
        )
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_mailFolderCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_mailFolder),
  })
  .partial()
  .passthrough();
const microsoft_graph_messageRuleCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_messageRule),
  })
  .partial()
  .passthrough();
const microsoft_graph_messageCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_message),
  })
  .partial()
  .passthrough();
const microsoft_graph_attachmentCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_attachment),
  })
  .partial()
  .passthrough();
const create_forward_draft_Body = z
  .object({
    ToRecipients: z.array(microsoft_graph_recipient),
    Message: z.union([microsoft_graph_message, z.object({}).partial().passthrough()]),
    Comment: z.string().nullable(),
  })
  .partial()
  .passthrough();
const create_reply_draft_Body = z
  .object({
    Message: z.union([microsoft_graph_message, z.object({}).partial().passthrough()]),
    Comment: z.string().nullable(),
  })
  .partial()
  .passthrough();
const microsoft_graph_attendeeBase = z
  .object({
    emailAddress: microsoft_graph_emailAddress.optional(),
    type: microsoft_graph_attendeeType.optional(),
  })
  .passthrough();
const microsoft_graph_locationConstraintItem = z
  .object({
    address: microsoft_graph_physicalAddress.optional(),
    coordinates: microsoft_graph_outlookGeoCoordinates.optional(),
    displayName: z.string().describe('The name associated with the location.').nullish(),
    locationEmailAddress: z.string().describe('Optional email address of the location.').nullish(),
    locationType: microsoft_graph_locationType.optional(),
    locationUri: z.string().describe('Optional URI representing the location.').nullish(),
    uniqueId: z.string().describe('For internal use only.').nullish(),
    uniqueIdType: microsoft_graph_locationUniqueIdType.optional(),
    resolveAvailability: z
      .boolean()
      .describe(
        "If set to true and the specified resource is busy, findMeetingTimes looks for another resource that is free. If set to false and the specified resource is busy, findMeetingTimes returns the resource best ranked in the user's cache without checking if it's free. Default is true."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_locationConstraint = z
  .object({
    isRequired: z
      .boolean()
      .describe(
        "The client requests the service to include in the response a meeting location for the meeting. If this is true and all the resources are busy, findMeetingTimes won't return any meeting time suggestions. If this is false and all the resources are busy, findMeetingTimes would still look for meeting times without locations."
      )
      .nullish(),
    locations: z
      .array(microsoft_graph_locationConstraintItem)
      .describe(
        'Constraint information for one or more locations that the client requests for the meeting.'
      )
      .optional(),
    suggestLocation: z
      .boolean()
      .describe('The client requests the service to suggest one or more meeting locations.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_activityDomain = z.enum(['unknown', 'work', 'personal', 'unrestricted']);
const microsoft_graph_timeConstraint = z
  .object({
    activityDomain: microsoft_graph_activityDomain.optional(),
    timeSlots: z.array(microsoft_graph_timeSlot).optional(),
  })
  .passthrough();
const find_meeting_times_Body = z
  .object({
    attendees: z.array(microsoft_graph_attendeeBase),
    locationConstraint: z.union([
      microsoft_graph_locationConstraint,
      z.object({}).partial().passthrough(),
    ]),
    timeConstraint: z.union([microsoft_graph_timeConstraint, z.object({}).partial().passthrough()]),
    meetingDuration: z
      .string()
      .regex(/^-?P([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+([.][0-9]+)?S)?)?$/)
      .nullable(),
    maxCandidates: z.number().gte(-2147483648).lte(2147483647).nullable(),
    isOrganizerOptional: z.boolean().nullable().default(false),
    returnSuggestionReasons: z.boolean().nullable().default(false),
    minimumAttendeePercentage: z.union([z.number(), z.string(), ReferenceNumeric]),
  })
  .partial()
  .passthrough();
const microsoft_graph_mailTipsType = z.enum([
  'automaticReplies',
  'mailboxFullStatus',
  'customMailTip',
  'externalMemberCount',
  'totalMemberCount',
  'maxMessageSize',
  'deliveryRestriction',
  'moderationStatus',
  'recipientScope',
  'recipientSuggestions',
]);
const get_mail_tips_Body = z
  .object({
    EmailAddresses: z.array(z.string()),
    MailTipsOptions: z.union([microsoft_graph_mailTipsType, z.object({}).partial().passthrough()]),
  })
  .partial()
  .passthrough();
const send_mail_Body = z
  .object({
    Message: microsoft_graph_message.describe(
      '[Note: Simplified from 35 properties to 25 most common ones]'
    ),
    SaveToSentItems: z.boolean().nullable().default(false),
  })
  .partial()
  .passthrough();
const microsoft_graph_externalLink = z
  .object({ href: z.string().describe('The URL of the link.').nullish() })
  .passthrough();
const microsoft_graph_notebookLinks = z
  .object({
    oneNoteClientUrl: microsoft_graph_externalLink.optional(),
    oneNoteWebUrl: microsoft_graph_externalLink.optional(),
  })
  .passthrough();
const microsoft_graph_onenoteUserRole = z.enum(['None', 'Owner', 'Contributor', 'Reader']);
const microsoft_graph_sectionLinks = z
  .object({
    oneNoteClientUrl: microsoft_graph_externalLink.optional(),
    oneNoteWebUrl: microsoft_graph_externalLink.optional(),
  })
  .passthrough();
const microsoft_graph_pageLinks = z
  .object({
    oneNoteClientUrl: microsoft_graph_externalLink.optional(),
    oneNoteWebUrl: microsoft_graph_externalLink.optional(),
  })
  .passthrough();
const microsoft_graph_onenotePage: z.ZodType<microsoft_graph_onenotePage> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      self: z
        .string()
        .describe('The endpoint where you can get details about the page. Read-only.')
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the page was created. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      content: z.string().describe("The page's HTML content.").nullish(),
      contentUrl: z.string().describe("The URL for the page's HTML content.  Read-only.").nullish(),
      createdByAppId: z
        .string()
        .describe('The unique identifier of the application that created the page. Read-only.')
        .nullish(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the page was last modified. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      level: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The indentation level of the page. Read-only.')
        .nullish(),
      links: microsoft_graph_pageLinks.optional(),
      order: z
        .number()
        .gte(-2147483648)
        .lte(2147483647)
        .describe('The order of the page within its parent section. Read-only.')
        .nullish(),
      title: z.string().describe('The title of the page.').nullish(),
      userTags: z.array(z.string().nullable()).optional(),
      parentNotebook: microsoft_graph_notebook.optional(),
      parentSection: microsoft_graph_onenoteSection.optional(),
    })
    .passthrough()
);
const microsoft_graph_onenoteSection: z.ZodType<microsoft_graph_onenoteSection> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      self: z
        .string()
        .describe('The endpoint where you can get details about the page. Read-only.')
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the page was created. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      createdBy: microsoft_graph_identitySet.optional(),
      displayName: z.string().describe('The name of the notebook.').nullish(),
      lastModifiedBy: microsoft_graph_identitySet.optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the notebook was last modified. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      isDefault: z
        .boolean()
        .describe("Indicates whether this is the user's default section. Read-only.")
        .nullish(),
      links: microsoft_graph_sectionLinks.optional(),
      pagesUrl: z
        .string()
        .describe(
          'The pages endpoint where you can get details for all the pages in the section. Read-only.'
        )
        .nullish(),
      pages: z
        .array(microsoft_graph_onenotePage)
        .describe('The collection of pages in the section.  Read-only. Nullable.')
        .optional(),
      parentNotebook: microsoft_graph_notebook.optional(),
      parentSectionGroup: microsoft_graph_sectionGroup.optional(),
    })
    .passthrough()
);
const microsoft_graph_sectionGroup: z.ZodType<microsoft_graph_sectionGroup> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      self: z
        .string()
        .describe('The endpoint where you can get details about the page. Read-only.')
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the page was created. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      createdBy: microsoft_graph_identitySet.optional(),
      displayName: z.string().describe('The name of the notebook.').nullish(),
      lastModifiedBy: microsoft_graph_identitySet.optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the notebook was last modified. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      sectionGroupsUrl: z
        .string()
        .describe(
          'The URL for the sectionGroups navigation property, which returns all the section groups in the section group. Read-only.'
        )
        .nullish(),
      sectionsUrl: z
        .string()
        .describe(
          'The URL for the sections navigation property, which returns all the sections in the section group. Read-only.'
        )
        .nullish(),
      parentNotebook: microsoft_graph_notebook.optional(),
      parentSectionGroup: microsoft_graph_sectionGroup.optional(),
      sectionGroups: z
        .array(microsoft_graph_sectionGroup)
        .describe('The section groups in the section. Read-only. Nullable.')
        .optional(),
      sections: z
        .array(microsoft_graph_onenoteSection)
        .describe('The sections in the section group. Read-only. Nullable.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_notebook: z.ZodType<microsoft_graph_notebook> = z.lazy(() =>
  z
    .object({
      id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
      self: z
        .string()
        .describe('The endpoint where you can get details about the page. Read-only.')
        .nullish(),
      createdDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the page was created. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      createdBy: microsoft_graph_identitySet.optional(),
      displayName: z.string().describe('The name of the notebook.').nullish(),
      lastModifiedBy: microsoft_graph_identitySet.optional(),
      lastModifiedDateTime: z
        .string()
        .regex(
          /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
        )
        .datetime({ offset: true })
        .describe(
          'The date and time when the notebook was last modified. The timestamp represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
        )
        .nullish(),
      isDefault: z
        .boolean()
        .describe("Indicates whether this is the user's default notebook. Read-only.")
        .nullish(),
      isShared: z
        .boolean()
        .describe(
          'Indicates whether the notebook is shared. If true, the contents of the notebook can be seen by people other than the owner. Read-only.'
        )
        .nullish(),
      links: microsoft_graph_notebookLinks.optional(),
      sectionGroupsUrl: z
        .string()
        .describe(
          'The URL for the sectionGroups navigation property, which returns all the section groups in the notebook. Read-only.'
        )
        .nullish(),
      sectionsUrl: z
        .string()
        .describe(
          'The URL for the sections navigation property, which returns all the sections in the notebook. Read-only.'
        )
        .nullish(),
      userRole: microsoft_graph_onenoteUserRole.optional(),
      sectionGroups: z
        .array(microsoft_graph_sectionGroup)
        .describe('The section groups in the notebook. Read-only. Nullable.')
        .optional(),
      sections: z
        .array(microsoft_graph_onenoteSection)
        .describe('The sections in the notebook. Read-only. Nullable.')
        .optional(),
    })
    .passthrough()
);
const microsoft_graph_notebookCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_notebook),
  })
  .partial()
  .passthrough();
const microsoft_graph_onenoteSectionCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_onenoteSection),
  })
  .partial()
  .passthrough();
const microsoft_graph_CopyNotebookModel = z
  .object({
    createdBy: z.string().nullish(),
    createdByIdentity: microsoft_graph_identitySet.optional(),
    createdTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    id: z.string().nullish(),
    isDefault: z.boolean().nullish(),
    isShared: z.boolean().nullish(),
    lastModifiedBy: z.string().nullish(),
    lastModifiedByIdentity: microsoft_graph_identitySet.optional(),
    lastModifiedTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .nullish(),
    links: microsoft_graph_notebookLinks.optional(),
    name: z.string().nullish(),
    sectionGroupsUrl: z.string().nullish(),
    sectionsUrl: z.string().nullish(),
    self: z.string().nullish(),
    userRole: microsoft_graph_onenoteUserRole.optional(),
  })
  .passthrough();
const microsoft_graph_onenotePageCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_onenotePage),
  })
  .partial()
  .passthrough();
const microsoft_graph_sectionGroupCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_sectionGroup),
  })
  .partial()
  .passthrough();
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
    conferenceId: z.string().describe('The conference id of the online meeting.').nullish(),
    dialinUrl: z
      .string()
      .describe('A URL to the externally-accessible web page that contains dial-in information.')
      .nullish(),
    tollFreeNumber: z
      .string()
      .describe('The toll-free number that connects to the Audio Conference Provider.')
      .nullish(),
    tollFreeNumbers: z
      .array(z.string().nullable())
      .describe('List of toll-free numbers that are displayed in the meeting invite.')
      .optional(),
    tollNumber: z
      .string()
      .describe('The toll number that connects to the Audio Conference Provider.')
      .nullish(),
    tollNumbers: z
      .array(z.string().nullable())
      .describe('List of toll numbers that are displayed in the meeting invite.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_chatInfo = z
  .object({
    messageId: z
      .string()
      .describe('The unique identifier of a message in a Microsoft Teams channel.')
      .nullish(),
    replyChainMessageId: z.string().describe('The ID of the reply message.').nullish(),
    threadId: z
      .string()
      .describe('The unique identifier for a thread in Microsoft Teams.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_chatRestrictions = z
  .object({
    allowTextOnly: z
      .boolean()
      .describe('Indicates whether only text is allowed in the meeting chat. Optional.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_joinMeetingIdSettings = z
  .object({
    isPasscodeRequired: z
      .boolean()
      .describe(
        'Indicates whether a passcode is required to join a meeting when using joinMeetingId. Optional.'
      )
      .nullish(),
    joinMeetingId: z
      .string()
      .describe('The meeting ID to be used to join a meeting. Optional. Read-only.')
      .nullish(),
    passcode: z
      .string()
      .describe('The passcode to join a meeting.  Optional. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_onlineMeeting = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    subject: z.string().describe('The subject of the online meeting.').nullish(),
    allowAttendeeToEnableCamera: z
      .boolean()
      .describe('Indicates whether attendees can turn on their camera.')
      .nullish(),
    allowAttendeeToEnableMic: z
      .boolean()
      .describe('Indicates whether attendees can turn on their microphone.')
      .nullish(),
    allowBreakoutRooms: z
      .boolean()
      .describe('Indicates whether breakout rooms are enabled for the meeting.')
      .nullish(),
    allowCopyingAndSharingMeetingContent: z
      .boolean()
      .describe(
        'Indicates whether the ability to copy and share meeting content is enabled for the meeting.'
      )
      .nullish(),
    allowedLobbyAdmitters: microsoft_graph_allowedLobbyAdmitterRoles.optional(),
    allowedPresenters: microsoft_graph_onlineMeetingPresenters.optional(),
    allowLiveShare: microsoft_graph_meetingLiveShareOptions.optional(),
    allowMeetingChat: microsoft_graph_meetingChatMode.optional(),
    allowParticipantsToChangeName: z
      .boolean()
      .describe(
        'Specifies if participants are allowed to rename themselves in an instance of the meeting.'
      )
      .nullish(),
    allowPowerPointSharing: z
      .boolean()
      .describe('Indicates whether PowerPoint live is enabled for the meeting.')
      .nullish(),
    allowRecording: z
      .boolean()
      .describe('Indicates whether recording is enabled for the meeting.')
      .nullish(),
    allowTeamworkReactions: z
      .boolean()
      .describe('Indicates if Teams reactions are enabled for the meeting.')
      .nullish(),
    allowTranscription: z
      .boolean()
      .describe('Indicates whether transcription is enabled for the meeting.')
      .nullish(),
    allowWhiteboard: z
      .boolean()
      .describe('Indicates whether whiteboard is enabled for the meeting.')
      .nullish(),
    audioConferencing: microsoft_graph_audioConferencing.optional(),
    chatInfo: microsoft_graph_chatInfo.optional(),
    chatRestrictions: microsoft_graph_chatRestrictions.optional(),
    expiryDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Indicates the date and time when the meeting resource expires. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    isEndToEndEncryptionEnabled: z
      .boolean()
      .describe('Indicates whether end-to-end encryption (E2EE) is enabled for the online meeting.')
      .nullish(),
    isEntryExitAnnounced: z
      .boolean()
      .describe('Indicates whether to announce when callers join or leave.')
      .nullish(),
    joinInformation: microsoft_graph_itemBody.optional(),
    joinMeetingIdSettings: microsoft_graph_joinMeetingIdSettings.optional(),
    joinWebUrl: z.string().describe('The join URL of the online meeting. Read-only.').nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_onlineMeetingCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_onlineMeeting),
  })
  .partial()
  .passthrough();
const microsoft_graph_virtualEventExternalInformation = z
  .object({
    applicationId: z
      .string()
      .describe('Identifier of the application that hosts the externalEventId. Read-only.')
      .nullish(),
    externalEventId: z
      .string()
      .describe(
        'The identifier for a virtualEventExternalInformation object that associates the virtual event with an event ID in an external application. This association bundles all the information (both supported and not supported in virtualEvent) into one virtual event object. Optional. If set, the maximum supported length is 256 characters.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_attendanceInterval = z
  .object({
    durationInSeconds: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'Duration of the meeting interval in seconds; that is, the difference between joinDateTime and leaveDateTime.'
      )
      .nullish(),
    joinDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The time the attendee joined in UTC.')
      .nullish(),
    leaveDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The time the attendee left in UTC.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_virtualEventExternalRegistrationInformation = z
  .object({
    referrer: z
      .string()
      .describe(
        'A URL or string that represents the location from which the registrant registered. Optional.'
      )
      .nullish(),
    registrationId: z
      .string()
      .describe(
        'The identifier for a virtualEventExternalRegistrationInformation object. Optional. If set, the maximum supported length is 256 characters.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_attendanceRecord = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    attendanceIntervals: z
      .array(microsoft_graph_attendanceInterval)
      .describe('List of time periods between joining and leaving a meeting.')
      .optional(),
    emailAddress: z
      .string()
      .describe('Email address of the user associated with this attendance record.')
      .nullish(),
    externalRegistrationInformation:
      microsoft_graph_virtualEventExternalRegistrationInformation.optional(),
    identity: microsoft_graph_identity.optional(),
    registrationId: z
      .string()
      .describe(
        'Unique identifier of a virtualEventRegistration that is available to all participants registered for the virtualEventWebinar.'
      )
      .nullish(),
    role: z
      .string()
      .describe(
        'Role of the attendee. The possible values are: None, Attendee, Presenter, and Organizer.'
      )
      .nullish(),
    totalAttendanceInSeconds: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Total duration of the attendances in seconds.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_meetingAttendanceReport = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    externalEventInformation: z
      .array(microsoft_graph_virtualEventExternalInformation)
      .describe(
        'The external information of a virtual event. Returned only for event organizers or coorganizers. Read-only.'
      )
      .optional(),
    meetingEndDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('UTC time when the meeting ended. Read-only.')
      .nullish(),
    meetingStartDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('UTC time when the meeting started. Read-only.')
      .nullish(),
    totalParticipantCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Total number of participants. Read-only.')
      .nullish(),
    attendanceRecords: z
      .array(microsoft_graph_attendanceRecord)
      .describe('List of attendance records of an attendance report. Read-only.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_meetingAttendanceReportCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_meetingAttendanceReport),
  })
  .partial()
  .passthrough();
const microsoft_graph_attendanceRecordCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_attendanceRecord),
  })
  .partial()
  .passthrough();
const microsoft_graph_callRecording = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    callId: z
      .string()
      .describe('The unique identifier for the call that is related to this recording. Read-only.')
      .nullish(),
    content: z.string().describe('The content of the recording. Read-only.').nullish(),
    contentCorrelationId: z
      .string()
      .describe(
        'The unique identifier that links the transcript with its corresponding recording. Read-only.'
      )
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time at which the recording was created. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
      )
      .nullish(),
    endDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time at which the recording ends. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
      )
      .nullish(),
    meetingId: z
      .string()
      .describe('The unique identifier of the onlineMeeting related to this recording. Read-only.')
      .nullish(),
    meetingOrganizer: microsoft_graph_identitySet.optional(),
    recordingContentUrl: z
      .string()
      .describe('The URL that can be used to access the content of the recording. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_callRecordingCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_callRecording),
  })
  .partial()
  .passthrough();
const microsoft_graph_callTranscript = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    callId: z
      .string()
      .describe('The unique identifier for the call that is related to this transcript. Read-only.')
      .nullish(),
    content: z.string().describe('The content of the transcript. Read-only.').nullish(),
    contentCorrelationId: z
      .string()
      .describe(
        'The unique identifier that links the transcript with its corresponding recording. Read-only.'
      )
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time at which the transcript was created. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
      )
      .nullish(),
    endDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time at which the transcription ends. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z. Read-only.'
      )
      .nullish(),
    meetingId: z
      .string()
      .describe(
        'The unique identifier of the online meeting related to this transcript. Read-only.'
      )
      .nullish(),
    meetingOrganizer: microsoft_graph_identitySet.optional(),
    metadataContent: z
      .string()
      .describe('The time-aligned metadata of the utterances in the transcript. Read-only.')
      .nullish(),
    transcriptContentUrl: z
      .string()
      .describe('The URL that can be used to access the content of the transcript. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_callTranscriptCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_callTranscript),
  })
  .partial()
  .passthrough();
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
const microsoft_graph_outlookCategory = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    color: microsoft_graph_categoryColor.optional(),
    displayName: z
      .string()
      .describe(
        "A unique name that identifies a category in the user's mailbox. After a category is created, the name cannot be changed. Read-only."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_outlookCategoryCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_outlookCategory),
  })
  .partial()
  .passthrough();
const microsoft_graph_timeZoneInformation = z
  .object({
    alias: z.string().describe('An identifier for the time zone.').nullish(),
    displayName: z.string().describe('A display string that represents the time zone.').nullish(),
  })
  .passthrough();
const microsoft_graph_personType = z
  .object({
    class: z.string().describe('The type of data source, such as Person.').nullish(),
    subclass: z
      .string()
      .describe('The secondary type of data source, such as OrganizationUser.')
      .nullish(),
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
    number: z.string().describe('The phone number.').nullish(),
    region: z.string().nullish(),
    type: microsoft_graph_phoneType.optional(),
  })
  .passthrough();
const microsoft_graph_selectionLikelihoodInfo = z.enum(['notSpecified', 'high']);
const microsoft_graph_scoredEmailAddress = z
  .object({
    address: z.string().describe('The email address.').nullish(),
    itemId: z.string().nullish(),
    relevanceScore: z
      .number()
      .describe(
        'The relevance score of the email address. A relevance score is used as a sort key, in relation to the other returned results. A higher relevance score value corresponds to a more relevant result. Relevance is determined by the user’s communication and collaboration patterns and business relationships. [Simplified from 3 options]'
      )
      .nullish(),
    selectionLikelihood: microsoft_graph_selectionLikelihoodInfo.optional(),
  })
  .passthrough();
const microsoft_graph_websiteType = z.enum(['other', 'home', 'work', 'blog', 'profile']);
const microsoft_graph_website = z
  .object({
    address: z.string().describe('The URL of the website.').nullish(),
    displayName: z.string().describe('The display name of the web site.').nullish(),
    type: microsoft_graph_websiteType.optional(),
  })
  .passthrough();
const microsoft_graph_person = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    birthday: z.string().describe("The person's birthday.").nullish(),
    companyName: z.string().describe("The name of the person's company.").nullish(),
    department: z.string().describe("The person's department.").nullish(),
    displayName: z.string().describe("The person's display name.").nullish(),
    givenName: z.string().describe("The person's given name.").nullish(),
    imAddress: z
      .string()
      .describe(
        'The instant message voice over IP (VOIP) session initiation protocol (SIP) address for the user. Read-only.'
      )
      .nullish(),
    isFavorite: z
      .boolean()
      .describe('True if the user has flagged this person as a favorite.')
      .nullish(),
    jobTitle: z.string().describe("The person's job title.").nullish(),
    officeLocation: z.string().describe("The location of the person's office.").nullish(),
    personNotes: z
      .string()
      .describe('Free-form notes that the user has taken about this person.')
      .nullish(),
    personType: microsoft_graph_personType.optional(),
    phones: z.array(microsoft_graph_phone).describe("The person's phone numbers.").optional(),
    postalAddresses: z
      .array(microsoft_graph_location)
      .describe("The person's addresses.")
      .optional(),
    profession: z.string().describe("The person's profession.").nullish(),
    scoredEmailAddresses: z
      .array(microsoft_graph_scoredEmailAddress)
      .describe("The person's email addresses.")
      .optional(),
    surname: z.string().describe("The person's surname.").nullish(),
    userPrincipalName: z
      .string()
      .describe(
        "The user principal name (UPN) of the person. The UPN is an Internet-style login name for the person based on the Internet standard RFC 822. By convention, this should map to the person's email name. The general format is alias@domain."
      )
      .nullish(),
    websites: z.array(microsoft_graph_website).describe("The person's websites.").optional(),
    yomiCompany: z
      .string()
      .describe("The phonetic Japanese name of the person's company.")
      .nullish(),
  })
  .passthrough();
const microsoft_graph_personCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_person),
  })
  .partial()
  .passthrough();
const microsoft_graph_plannerChecklistItems = z.object({}).passthrough();
const microsoft_graph_plannerPreviewType = z.enum([
  'automatic',
  'noPreview',
  'checklist',
  'description',
  'reference',
]);
const microsoft_graph_plannerExternalReferences = z.object({}).passthrough();
const microsoft_graph_plannerTaskDetails = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    checklist: microsoft_graph_plannerChecklistItems.optional(),
    description: z.string().describe('Description of the task.').nullish(),
    previewType: microsoft_graph_plannerPreviewType.optional(),
    references: microsoft_graph_plannerExternalReferences.optional(),
  })
  .passthrough();
const microsoft_graph_plannerAppliedCategories = z.object({}).passthrough();
const microsoft_graph_plannerAssignments = z.object({}).passthrough();
const microsoft_graph_plannerOrderHintsByAssignee = z.object({}).passthrough();
const microsoft_graph_plannerAssignedToTaskBoardTaskFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    orderHintsByAssignee: microsoft_graph_plannerOrderHintsByAssignee.optional(),
    unassignedOrderHint: z
      .string()
      .describe(
        "Hint value used to order the task on the AssignedTo view of the Task Board when the task isn't assigned to anyone, or if the orderHintsByAssignee dictionary doesn't provide an order hint for the user the task is assigned to. The format is defined as outlined here."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_plannerBucketTaskBoardTaskFormat = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    orderHint: z
      .string()
      .describe(
        'Hint used to order tasks in the bucket view of the task board. For details about the supported format, see Using order hints in Planner.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_plannerTask = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Read-only. Date and time at which the task is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    title: z.string().describe('Title of the task.').optional(),
    details: microsoft_graph_plannerTaskDetails.optional(),
    activeChecklistItemCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of checklist items with value set to false, representing incomplete items.')
      .nullish(),
    appliedCategories: microsoft_graph_plannerAppliedCategories.optional(),
    assigneePriority: z
      .string()
      .describe(
        'Hint used to order items of this type in a list view. The format is defined as outlined here.'
      )
      .nullish(),
    assignments: microsoft_graph_plannerAssignments.optional(),
    bucketId: z
      .string()
      .describe(
        "Bucket ID to which the task belongs. The bucket needs to be in the plan that the task is in. It's 28 characters long and case-sensitive. Format validation is done on the service."
      )
      .nullish(),
    checklistItemCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of checklist items that are present on the task.')
      .nullish(),
    completedBy: microsoft_graph_identitySet.optional(),
    completedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "Read-only. Date and time at which the 'percentComplete' of the task is set to '100'. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
      )
      .nullish(),
    conversationThreadId: z
      .string()
      .describe(
        'Thread ID of the conversation on the task. This is the ID of the conversation thread object created in the group.'
      )
      .nullish(),
    createdBy: microsoft_graph_identitySet.optional(),
    dueDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    hasDescription: z
      .boolean()
      .describe(
        'Read-only. Value is true if the details object of the task has a nonempty description and false otherwise.'
      )
      .nullish(),
    orderHint: z
      .string()
      .describe(
        'Hint used to order items of this type in a list view. The format is defined as outlined here.'
      )
      .nullish(),
    percentComplete: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Percentage of task completion. When set to 100, the task is considered completed.')
      .nullish(),
    planId: z.string().describe('Plan ID to which the task belongs.').nullish(),
    previewType: microsoft_graph_plannerPreviewType.optional(),
    priority: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        "Priority of the task. The valid range of values is between 0 and 10, with the increasing value being lower priority (0 has the highest priority and 10 has the lowest priority).  Currently, Planner interprets values 0 and 1 as 'urgent', 2, 3 and 4 as 'important', 5, 6, and 7 as 'medium', and 8, 9, and 10 as 'low'.  Additionally, Planner sets the value 1 for 'urgent', 3 for 'important', 5 for 'medium', and 9 for 'low'."
      )
      .nullish(),
    referenceCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Number of external references that exist on the task.')
      .nullish(),
    startDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time at which the task starts. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    assignedToTaskBoardFormat: microsoft_graph_plannerAssignedToTaskBoardTaskFormat.optional(),
    bucketTaskBoardFormat: microsoft_graph_plannerBucketTaskBoardTaskFormat.optional(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_plannerTaskCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_plannerTask),
  })
  .partial()
  .passthrough();
const set_my_presence_Body = z
  .object({
    sessionId: z.string().nullable(),
    availability: z.string(),
    activity: z.string(),
    expirationDuration: z
      .string()
      .regex(/^-?P([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+([.][0-9]+)?S)?)?$/)
      .nullable(),
  })
  .partial()
  .passthrough();
const set_my_status_message_Body = z
  .object({
    statusMessage: z.union([
      microsoft_graph_presenceStatusMessage,
      z.object({}).partial().passthrough(),
    ]),
  })
  .partial()
  .passthrough();
const set_my_user_preferred_presence_Body = z
  .object({
    availability: z.string(),
    activity: z.string(),
    expirationDuration: z
      .string()
      .regex(/^-?P([0-9]+D)?(T([0-9]+H)?([0-9]+M)?([0-9]+([.][0-9]+)?S)?)?$/)
      .nullable(),
  })
  .partial()
  .passthrough();
const microsoft_graph_associatedTeamInfo = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z.string().describe('The name of the team.').nullish(),
    tenantId: z.string().describe('The ID of the Microsoft Entra tenant.').nullish(),
    team: microsoft_graph_team
      .describe('[Note: Simplified from 30 properties to 25 most common ones]')
      .optional(),
  })
  .passthrough();
const microsoft_graph_associatedTeamInfoCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_associatedTeamInfo),
  })
  .partial()
  .passthrough();
const microsoft_graph_userScopeTeamsAppInstallation = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    consentedPermissionSet: microsoft_graph_teamsAppPermissionSet.optional(),
    teamsApp: microsoft_graph_teamsApp.optional(),
    teamsAppDefinition: microsoft_graph_teamsAppDefinition.optional(),
    chat: microsoft_graph_chat.optional(),
  })
  .passthrough();
const microsoft_graph_userScopeTeamsAppInstallationCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_userScopeTeamsAppInstallation),
  })
  .partial()
  .passthrough();
const send_my_activity_notification_Body = z
  .object({
    topic: z.object({}).partial().passthrough(),
    activityType: z.string().nullable(),
    chainId: z.number().nullable(),
    previewText: z.union([microsoft_graph_itemBody, z.object({}).partial().passthrough()]),
    teamsAppId: z.string().nullable(),
    templateParameters: z.array(z.object({}).partial().passthrough()),
    iconId: z.string().nullable(),
  })
  .partial()
  .passthrough();
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
const microsoft_graph_attachmentBase = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    contentType: z.string().describe('The MIME type.').nullish(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    name: z
      .string()
      .describe("The display name of the attachment. This doesn't need to be the actual file name.")
      .nullish(),
    size: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The length of the attachment in bytes.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_attachmentSession = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    content: z.string().describe('The content streams that are uploaded.').nullish(),
    expirationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time in UTC when the upload session will expire. The complete file must be uploaded before this expiration time is reached.'
      )
      .nullish(),
    nextExpectedRanges: z
      .array(z.string().nullable())
      .describe(
        'Indicates a single value {start} that represents the location in the file where the next upload should begin.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_checklistItem = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    checkedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The date and time when the checklistItem was finished.')
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('The date and time when the checklistItem was created.')
      .optional(),
    displayName: z.string().describe('Indicates the title of the checklistItem.').nullish(),
    isChecked: z
      .boolean()
      .describe('State that indicates whether the item is checked off or not.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_linkedResource = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    applicationName: z
      .string()
      .describe('The app name of the source that sends the linkedResource.')
      .nullish(),
    displayName: z.string().describe('The title of the linkedResource.').nullish(),
    externalId: z
      .string()
      .describe(
        'ID of the object that is associated with this task on the third-party/partner system.'
      )
      .nullish(),
    webUrl: z.string().describe('Deep link to the linkedResource.').nullish(),
  })
  .passthrough();
const microsoft_graph_todoTask = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    body: microsoft_graph_itemBody.optional(),
    bodyLastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "The date and time when the task body was last modified. By default, it is in UTC. You can provide a custom time zone in the request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2020 would look like this: '2020-01-01T00:00:00Z'."
      )
      .optional(),
    categories: z
      .array(z.string().nullable())
      .describe(
        'The categories associated with the task. Each category corresponds to the displayName property of an outlookCategory that the user has defined.'
      )
      .optional(),
    completedDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "The date and time when the task was created. By default, it is in UTC. You can provide a custom time zone in the request header. The property value uses ISO 8601 format. For example, midnight UTC on Jan 1, 2020 would look like this: '2020-01-01T00:00:00Z'."
      )
      .optional(),
    dueDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    hasAttachments: z.boolean().describe('Indicates whether the task has attachments.').nullish(),
    importance: microsoft_graph_importance.optional(),
    isReminderOn: z
      .boolean()
      .describe('Set to true if an alert is set to remind the user of the task.')
      .optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        "The date and time when the task was last modified. By default, it is in UTC. You can provide a custom time zone in the request header. The property value uses ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2020 would look like this: '2020-01-01T00:00:00Z'."
      )
      .optional(),
    recurrence: microsoft_graph_patternedRecurrence.optional(),
    reminderDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    startDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    status: microsoft_graph_taskStatus.optional(),
    title: z.string().describe('A brief description of the task.').nullish(),
    attachments: z
      .array(microsoft_graph_attachmentBase)
      .describe('A collection of file attachments for the task.')
      .optional(),
    attachmentSessions: z.array(microsoft_graph_attachmentSession).optional(),
    checklistItems: z
      .array(microsoft_graph_checklistItem)
      .describe('A collection of checklistItems linked to a task.')
      .optional(),
    extensions: z
      .array(microsoft_graph_extension)
      .describe('The collection of open extensions defined for the task. Nullable.')
      .optional(),
    linkedResources: z
      .array(microsoft_graph_linkedResource)
      .describe('A collection of resources linked to the task.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_todoTaskList = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z.string().describe('The name of the task list.').nullish(),
    isOwner: z.boolean().describe('True if the user is owner of the given task list.').optional(),
    isShared: z.boolean().describe('True if the task list is shared with other users').optional(),
    wellknownListName: microsoft_graph_wellknownListName.optional(),
    extensions: z
      .array(microsoft_graph_extension)
      .describe('The collection of open extensions defined for the task list. Nullable.')
      .optional(),
    tasks: z
      .array(microsoft_graph_todoTask)
      .describe('The tasks in this task list. Read-only. Nullable.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_todoTaskListCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_todoTaskList),
  })
  .partial()
  .passthrough();
const microsoft_graph_todoTaskCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_todoTask),
  })
  .partial()
  .passthrough();
const microsoft_graph_linkedResourceCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_linkedResource),
  })
  .partial()
  .passthrough();
const microsoft_graph_checkInMethod = z.enum([
  'unspecified',
  'manual',
  'inferred',
  'verified',
  'unknownFutureValue',
]);
const microsoft_graph_checkInClaim = z
  .object({
    calendarEventId: z
      .string()
      .describe(
        'The unique identifier for an Outlook calendar event associated with the checkInClaim object. For more information, see the iCalUId property in event.'
      )
      .optional(),
    checkInMethod: microsoft_graph_checkInMethod.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'The date and time when the checkInClaim object was created. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_place = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    address: microsoft_graph_physicalAddress.optional(),
    displayName: z.string().describe('The name that is associated with the place.').optional(),
    geoCoordinates: microsoft_graph_outlookGeoCoordinates.optional(),
    isWheelChairAccessible: z
      .boolean()
      .describe('Indicates whether the place is wheelchair accessible.')
      .nullish(),
    label: z.string().describe('User-defined description of the place.').nullish(),
    parentId: z.string().describe('The ID of a parent place.').nullish(),
    phone: z.string().describe('The phone number of the place.').nullish(),
    tags: z
      .array(z.string())
      .describe('Custom tags that are associated with the place for categorization or filtering.')
      .optional(),
    checkIns: z
      .array(microsoft_graph_checkInClaim)
      .describe(
        'A subresource of a place object that indicates the check-in status of an Outlook calendar event booked at the place.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_bookingType = z.enum(['unknown', 'standard', 'reserved']);
const microsoft_graph_placeFeatureEnablement = z.enum([
  'unknown',
  'enabled',
  'disabled',
  'unknownFutureValue',
]);
const microsoft_graph_room = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    address: microsoft_graph_physicalAddress.optional(),
    displayName: z.string().describe('The name that is associated with the place.').optional(),
    geoCoordinates: microsoft_graph_outlookGeoCoordinates.optional(),
    isWheelChairAccessible: z
      .boolean()
      .describe('Indicates whether the place is wheelchair accessible.')
      .nullish(),
    label: z.string().describe('User-defined description of the place.').nullish(),
    parentId: z.string().describe('The ID of a parent place.').nullish(),
    phone: z.string().describe('The phone number of the place.').nullish(),
    tags: z
      .array(z.string())
      .describe('Custom tags that are associated with the place for categorization or filtering.')
      .optional(),
    checkIns: z
      .array(microsoft_graph_checkInClaim)
      .describe(
        'A subresource of a place object that indicates the check-in status of an Outlook calendar event booked at the place.'
      )
      .optional(),
    audioDeviceName: z
      .string()
      .describe('Specifies the name of the audio device in the room.')
      .nullish(),
    bookingType: microsoft_graph_bookingType.optional(),
    building: z
      .string()
      .describe('Specifies the building name or building number that the room is in.')
      .nullish(),
    capacity: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Specifies the capacity of the room.')
      .nullish(),
    displayDeviceName: z
      .string()
      .describe('Specifies the name of the display device in the room.')
      .nullish(),
    emailAddress: z.string().describe('Email address of the room.').nullish(),
    floorLabel: z
      .string()
      .describe('Specifies a descriptive label for the floor, for example, P.')
      .nullish(),
    floorNumber: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Specifies the floor number that the room is on.')
      .nullish(),
    nickname: z
      .string()
      .describe("Specifies a nickname for the room, for example, 'conf room'.")
      .optional(),
    placeId: z
      .string()
      .describe('An alternative immutable unique identifier of the room. Read-only.')
      .nullish(),
    teamsEnabledState: microsoft_graph_placeFeatureEnablement.optional(),
    videoDeviceName: z
      .string()
      .describe('Specifies the name of the video device in the room.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_placeMode = z.object({}).passthrough();
const microsoft_graph_workspace = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    address: microsoft_graph_physicalAddress.optional(),
    displayName: z.string().describe('The name that is associated with the place.').optional(),
    geoCoordinates: microsoft_graph_outlookGeoCoordinates.optional(),
    isWheelChairAccessible: z
      .boolean()
      .describe('Indicates whether the place is wheelchair accessible.')
      .nullish(),
    label: z.string().describe('User-defined description of the place.').nullish(),
    parentId: z.string().describe('The ID of a parent place.').nullish(),
    phone: z.string().describe('The phone number of the place.').nullish(),
    tags: z
      .array(z.string())
      .describe('Custom tags that are associated with the place for categorization or filtering.')
      .optional(),
    checkIns: z
      .array(microsoft_graph_checkInClaim)
      .describe(
        'A subresource of a place object that indicates the check-in status of an Outlook calendar event booked at the place.'
      )
      .optional(),
    capacity: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The maximum number of individual desks within a workspace.')
      .nullish(),
    displayDeviceName: z
      .string()
      .describe(
        'The name of the display device (for example, monitor or projector) that is available in the workspace.'
      )
      .nullish(),
    emailAddress: z
      .string()
      .describe(
        'The email address that is associated with the workspace. This email address is used for booking.'
      )
      .nullish(),
    mode: microsoft_graph_placeMode.optional(),
    nickname: z
      .string()
      .describe(
        'A short, friendly name for the workspace, often used for easier identification or display in the UI.'
      )
      .optional(),
    placeId: z
      .string()
      .describe('An alternative immutable unique identifier of the workspace. Read-only.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_roomList = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    address: microsoft_graph_physicalAddress.optional(),
    displayName: z.string().describe('The name that is associated with the place.').optional(),
    geoCoordinates: microsoft_graph_outlookGeoCoordinates.optional(),
    isWheelChairAccessible: z
      .boolean()
      .describe('Indicates whether the place is wheelchair accessible.')
      .nullish(),
    label: z.string().describe('User-defined description of the place.').nullish(),
    parentId: z.string().describe('The ID of a parent place.').nullish(),
    phone: z.string().describe('The phone number of the place.').nullish(),
    tags: z
      .array(z.string())
      .describe('Custom tags that are associated with the place for categorization or filtering.')
      .optional(),
    checkIns: z
      .array(microsoft_graph_checkInClaim)
      .describe(
        'A subresource of a place object that indicates the check-in status of an Outlook calendar event booked at the place.'
      )
      .optional(),
    emailAddress: z.string().describe('The email address of the room list.').nullish(),
    rooms: z.array(microsoft_graph_room).optional(),
    workspaces: z.array(microsoft_graph_workspace).optional(),
  })
  .passthrough();
const microsoft_graph_roomCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_room),
  })
  .partial()
  .passthrough();
const microsoft_graph_plannerBucket = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    name: z.string().describe('Name of the bucket.').optional(),
    orderHint: z
      .string()
      .describe(
        'Hint used to order items of this type in a list view. For details about the supported format, see Using order hints in Planner.'
      )
      .nullish(),
    planId: z.string().describe('Plan ID to which the bucket belongs.').nullish(),
    tasks: z
      .array(microsoft_graph_plannerTask)
      .describe('Read-only. Nullable. The collection of tasks in the bucket.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_plannerContainerType = z.enum(['group', 'unknownFutureValue', 'roster']);
const microsoft_graph_plannerPlanContainer = z
  .object({
    containerId: z
      .string()
      .describe('The identifier of the resource that contains the plan. Optional.')
      .nullish(),
    type: microsoft_graph_plannerContainerType.optional(),
    url: z.string().describe('The full canonical URL of the container. Optional.').nullish(),
  })
  .passthrough();
const microsoft_graph_plannerCategoryDescriptions = z
  .object({
    category1: z.string().describe('The label associated with Category 1').nullish(),
    category10: z.string().describe('The label associated with Category 10').nullish(),
    category11: z.string().describe('The label associated with Category 11').nullish(),
    category12: z.string().describe('The label associated with Category 12').nullish(),
    category13: z.string().describe('The label associated with Category 13').nullish(),
    category14: z.string().describe('The label associated with Category 14').nullish(),
    category15: z.string().describe('The label associated with Category 15').nullish(),
    category16: z.string().describe('The label associated with Category 16').nullish(),
    category17: z.string().describe('The label associated with Category 17').nullish(),
    category18: z.string().describe('The label associated with Category 18').nullish(),
    category19: z.string().describe('The label associated with Category 19').nullish(),
    category2: z.string().describe('The label associated with Category 2').nullish(),
    category20: z.string().describe('The label associated with Category 20').nullish(),
    category21: z.string().describe('The label associated with Category 21').nullish(),
    category22: z.string().describe('The label associated with Category 22').nullish(),
    category23: z.string().describe('The label associated with Category 23').nullish(),
    category24: z.string().describe('The label associated with Category 24').nullish(),
    category25: z.string().describe('The label associated with Category 25').nullish(),
    category3: z.string().describe('The label associated with Category 3').nullish(),
    category4: z.string().describe('The label associated with Category 4').nullish(),
    category5: z.string().describe('The label associated with Category 5').nullish(),
    category6: z.string().describe('The label associated with Category 6').nullish(),
    category7: z.string().describe('The label associated with Category 7').nullish(),
    category8: z.string().describe('The label associated with Category 8').nullish(),
    category9: z.string().describe('The label associated with Category 9').nullish(),
  })
  .passthrough();
const microsoft_graph_plannerUserIds = z.object({}).passthrough();
const microsoft_graph_plannerPlanDetails = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    categoryDescriptions: microsoft_graph_plannerCategoryDescriptions.optional(),
    sharedWith: microsoft_graph_plannerUserIds.optional(),
  })
  .passthrough();
const microsoft_graph_plannerPlan = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    container: microsoft_graph_plannerPlanContainer.optional(),
    createdBy: microsoft_graph_identitySet.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Read-only. Date and time at which the plan is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
      )
      .nullish(),
    owner: z
      .string()
      .describe(
        "Use the container property instead. ID of the group that owns the plan. After it's set, this property can’t be updated. This property won't return a valid group ID if the container of the plan isn't a group."
      )
      .nullish(),
    title: z.string().describe('Required. Title of the plan.').optional(),
    buckets: z
      .array(microsoft_graph_plannerBucket)
      .describe('Read-only. Nullable. Collection of buckets in the plan.')
      .optional(),
    details: microsoft_graph_plannerPlanDetails.optional(),
    tasks: z
      .array(microsoft_graph_plannerTask)
      .describe('Read-only. Nullable. Collection of tasks in the plan.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_plannerBucketCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_plannerBucket),
  })
  .partial()
  .passthrough();
const microsoft_graph_bucketAggregationRange = z
  .object({
    from: z
      .string()
      .describe(
        'Defines the lower bound from which to compute the aggregation. This can be a numeric value or a string representation of a date using the YYYY-MM-DDTHH:mm:ss.sssZ format. Required.'
      )
      .optional(),
    to: z
      .string()
      .describe(
        'Defines the upper bound up to which to compute the aggregation. This can be a numeric value or a string representation of a date using the YYYY-MM-DDTHH:mm:ss.sssZ format. Required.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_bucketAggregationSortProperty = z.enum([
  'count',
  'keyAsString',
  'keyAsNumber',
  'unknownFutureValue',
]);
const microsoft_graph_bucketAggregationDefinition = z
  .object({
    isDescending: z
      .boolean()
      .describe(
        'True to specify the sort order as descending. The default is false, with the sort order as ascending. Optional.'
      )
      .nullish(),
    minimumCount: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The minimum number of items that should be present in the aggregation to be returned in a bucket. Optional.'
      )
      .nullish(),
    prefixFilter: z
      .string()
      .describe(
        'A filter to define a matching criteria. The key should start with the specified prefix to be returned in the response. Optional.'
      )
      .nullish(),
    ranges: z
      .array(microsoft_graph_bucketAggregationRange)
      .describe(
        'Specifies the manual ranges to compute the aggregations. This is only valid for nonstring refiners of date or numeric type. Optional.'
      )
      .optional(),
    sortBy: microsoft_graph_bucketAggregationSortProperty.optional(),
  })
  .passthrough();
const microsoft_graph_aggregationOption = z
  .object({
    bucketDefinition: microsoft_graph_bucketAggregationDefinition.optional(),
    field: z
      .string()
      .describe(
        'Computes aggregation on the field while the field exists in the current entity type. Required.'
      )
      .optional(),
    size: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        "The number of searchBucket resources to be returned. This isn't required when the range is provided manually in the search request. The minimum accepted size is 1, and the maximum is 65535. Optional."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_collapseProperty = z
  .object({
    fields: z
      .array(z.string())
      .describe(
        'Defines the collapse group to trim results. The properties in this collection must be sortable/refinable properties. Required.'
      )
      .optional(),
    limit: z
      .number()
      .gte(-32768)
      .lte(32767)
      .describe(
        'Defines a maximum limit count for this field. This numeric value must be a positive integer. Required.'
      )
      .optional(),
  })
  .passthrough();
const microsoft_graph_entityType = z.enum([
  'event',
  'message',
  'driveItem',
  'externalItem',
  'site',
  'list',
  'listItem',
  'drive',
  'unknownFutureValue',
  'chatMessage',
  'person',
  'acronym',
  'bookmark',
]);
const microsoft_graph_searchQuery = z
  .object({
    queryString: z
      .string()
      .describe('The search query containing the search terms. Required.')
      .optional(),
    queryTemplate: z
      .string()
      .describe(
        'Provides a way to decorate the query string. Supports both KQL and query variables. Optional.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_searchAlterationOptions = z
  .object({
    enableModification: z
      .boolean()
      .describe(
        'Indicates whether spelling modifications are enabled. If enabled, the user gets the search results for the corrected query if there were no results for the original query with typos. The response will also include the spelling modification information in the queryAlterationResponse property. Optional.'
      )
      .nullish(),
    enableSuggestion: z
      .boolean()
      .describe(
        'Indicates whether spelling suggestions are enabled. If enabled, the user gets the search results for the original search query and suggestions for spelling correction in the queryAlterationResponse property of the response for the typos in the query. Optional.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_resultTemplateOption = z
  .object({
    enableResultTemplate: z
      .boolean()
      .describe(
        'Indicates whether search display layouts are enabled. If enabled, the user will get the result template to render the search results content in the resultTemplates property of the response. The result template is based on Adaptive Cards. Optional.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_searchContent = z.enum([
  'sharedContent',
  'privateContent',
  'unknownFutureValue',
]);
const microsoft_graph_sharePointOneDriveOptions = z
  .object({ includeContent: microsoft_graph_searchContent.optional() })
  .passthrough();
const microsoft_graph_sortProperty = z
  .object({
    isDescending: z
      .boolean()
      .describe(
        'True if the sort order is descending. Default is false, with the sort order as ascending. Optional.'
      )
      .nullish(),
    name: z.string().describe('The name of the property to sort on. Required.').optional(),
  })
  .passthrough();
const microsoft_graph_searchRequest = z
  .object({
    aggregationFilters: z
      .array(z.string().nullable())
      .describe(
        "Contains one or more filters to obtain search results aggregated and filtered to a specific value of a field. Optional.Build this filter based on a prior search that aggregates by the same field. From the response of the prior search, identify the searchBucket that filters results to the specific value of the field, use the string in its aggregationFilterToken property, and build an aggregation filter string in the format '{field}:/'{aggregationFilterToken}/''. If multiple values for the same field need to be provided, use the strings in its aggregationFilterToken property and build an aggregation filter string in the format '{field}:or(/'{aggregationFilterToken1}/',/'{aggregationFilterToken2}/')'. For example, searching and aggregating drive items by file type returns a searchBucket for the file type docx in the response. You can conveniently use the aggregationFilterToken returned for this searchBucket in a subsequent search query and filter matches down to drive items of the docx file type. Example 1 and example 2 show the actual requests and responses."
      )
      .optional(),
    aggregations: z
      .array(microsoft_graph_aggregationOption)
      .describe(
        'Specifies aggregations (also known as refiners) to be returned alongside search results. Optional.'
      )
      .optional(),
    collapseProperties: z
      .array(microsoft_graph_collapseProperty)
      .describe(
        'Contains the ordered collection of fields and limit to collapse results. Optional.'
      )
      .optional(),
    contentSources: z
      .array(z.string().nullable())
      .describe('Contains the connection to be targeted.')
      .optional(),
    enableTopResults: z
      .boolean()
      .describe(
        'This triggers hybrid sort for messages : the first 3 messages are the most relevant. This property is only applicable to entityType=message. Optional.'
      )
      .nullish(),
    entityTypes: z
      .array(z.union([microsoft_graph_entityType, z.object({}).partial().passthrough()]))
      .describe(
        'One or more types of resources expected in the response. The possible values are: event, message, driveItem, externalItem, site, list, listItem, drive, chatMessage, person, acronym, bookmark.  Use the Prefer: include-unknown-enum-members request header to get the following members in this evolvable enum: chatMessage, person, acronym, bookmark. See known limitations for those combinations of two or more entity types that are supported in the same search request. Required.'
      )
      .optional(),
    fields: z
      .array(z.string().nullable())
      .describe(
        'Contains the fields to be returned for each resource object specified in entityTypes, allowing customization of the fields returned by default; otherwise, including additional fields such as custom managed properties from SharePoint and OneDrive, or custom fields in externalItem from the content that Microsoft 365 Copilot connectors bring in. The fields property can use the semantic labels applied to properties. For example, if a property is labeled as title, you can retrieve it using the following syntax: label_title. Optional.'
      )
      .optional(),
    from: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'Specifies the offset for the search results. Offset 0 returns the very first result. Optional.'
      )
      .optional(),
    query: microsoft_graph_searchQuery.optional(),
    queryAlterationOptions: microsoft_graph_searchAlterationOptions.optional(),
    region: z
      .string()
      .describe(
        'The geographic location for the search. Required for searches that use application permissions. For details, see Get the region value.'
      )
      .nullish(),
    resultTemplateOptions: microsoft_graph_resultTemplateOption.optional(),
    sharePointOneDriveOptions: microsoft_graph_sharePointOneDriveOptions.optional(),
    size: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The size of the page to be retrieved. The maximum value is 500. Optional.')
      .optional(),
    sortProperties: z
      .array(microsoft_graph_sortProperty)
      .describe(
        'Contains the ordered collection of fields and direction to sort results. There can be at most 5 sort properties in the collection. Optional.'
      )
      .optional(),
  })
  .passthrough();
const search_query_Body = z
  .object({ requests: z.array(microsoft_graph_searchRequest) })
  .partial()
  .passthrough();
const microsoft_graph_searchBucket = z
  .object({
    aggregationFilterToken: z
      .string()
      .describe(
        "A token containing the encoded filter to aggregate search matches by the specific key value. To use the filter, pass the token as part of the aggregationFilter property in a searchRequest object, in the format '{field}:/'{aggregationFilterToken}/''. See an example."
      )
      .nullish(),
    count: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        'The approximate number of search matches that share the same value specified in the key property. Note that this number is not the exact number of matches.'
      )
      .nullish(),
    key: z
      .string()
      .describe('The discrete value of the field that an aggregation was computed on.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_searchAggregation = z
  .object({
    buckets: z.array(microsoft_graph_searchBucket).optional(),
    field: z.string().nullish(),
  })
  .passthrough();
const microsoft_graph_searchHit = z
  .object({
    contentSource: z
      .string()
      .describe('The name of the content source that the externalItem is part of.')
      .nullish(),
    hitId: z
      .string()
      .describe(
        'The internal identifier for the item. The format of the identifier varies based on the entity type. For details, see hitId format.'
      )
      .nullish(),
    isCollapsed: z
      .boolean()
      .describe(
        'Indicates whether the current result is collapsed when the collapseProperties property in the searchRequest is used.'
      )
      .nullish(),
    rank: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('The rank or the order of the result.')
      .nullish(),
    resultTemplateId: z
      .string()
      .describe(
        'ID of the result template used to render the search result. This ID must map to a display layout in the resultTemplates dictionary that is also included in the searchResponse.'
      )
      .nullish(),
    summary: z.string().describe('A summary of the result, if a summary is available.').nullish(),
    resource: microsoft_graph_entity.optional(),
  })
  .passthrough();
const microsoft_graph_searchHitsContainer = z
  .object({
    aggregations: z.array(microsoft_graph_searchAggregation).optional(),
    hits: z
      .array(microsoft_graph_searchHit)
      .describe('A collection of the search results.')
      .optional(),
    moreResultsAvailable: z
      .boolean()
      .describe(
        'Provides information if more results are available. Based on this information, you can adjust the from and size properties of the searchRequest accordingly.'
      )
      .nullish(),
    total: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe(
        "The total number of results. Note this isn't the number of results on the page, but the total number of results satisfying the query."
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_alteredQueryToken = z
  .object({
    length: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Defines the length of a changed segment.')
      .nullish(),
    offset: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Defines the offset of a changed segment.')
      .nullish(),
    suggestion: z.string().describe('Represents the corrected segment string.').nullish(),
  })
  .passthrough();
const microsoft_graph_searchAlteration = z
  .object({
    alteredHighlightedQueryString: z
      .string()
      .describe(
        'Defines the altered highlighted query string with spelling correction. The annotation around the corrected segment is: /ue000, /ue001.'
      )
      .nullish(),
    alteredQueryString: z
      .string()
      .describe('Defines the altered query string with spelling correction.')
      .nullish(),
    alteredQueryTokens: z
      .array(microsoft_graph_alteredQueryToken)
      .describe('Represents changed segments related to an original user query.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_searchAlterationType = z.enum([
  'suggestion',
  'modification',
  'unknownFutureValue',
]);
const microsoft_graph_alterationResponse = z
  .object({
    originalQueryString: z.string().describe('Defines the original user query string.').nullish(),
    queryAlteration: microsoft_graph_searchAlteration.optional(),
    queryAlterationType: microsoft_graph_searchAlterationType.optional(),
  })
  .passthrough();
const microsoft_graph_resultTemplateDictionary = z.object({}).passthrough();
const microsoft_graph_searchResponse = z
  .object({
    hitsContainers: z
      .array(microsoft_graph_searchHitsContainer)
      .describe('A collection of search results.')
      .optional(),
    queryAlterationResponse: microsoft_graph_alterationResponse.optional(),
    resultTemplates: microsoft_graph_resultTemplateDictionary.optional(),
    searchTerms: z
      .array(z.string().nullable())
      .describe('Contains the search terms sent in the initial search query.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_root = z.object({}).passthrough();
const microsoft_graph_siteArchiveStatus = z.enum([
  'recentlyArchived',
  'fullyArchived',
  'reactivating',
  'unknownFutureValue',
]);
const microsoft_graph_siteArchivalDetails = z
  .object({ archiveStatus: microsoft_graph_siteArchiveStatus.optional() })
  .passthrough();
const microsoft_graph_siteCollection = z
  .object({
    archivalDetails: microsoft_graph_siteArchivalDetails.optional(),
    dataLocationCode: z
      .string()
      .describe(
        'The geographic region code for where this site collection resides. Only present for multi-geo tenants. Read-only.'
      )
      .nullish(),
    hostname: z.string().describe('The hostname for the site collection. Read-only.').nullish(),
    root: microsoft_graph_root.optional(),
  })
  .passthrough();
const microsoft_graph_baseItem = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdBy: microsoft_graph_identitySet.optional(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time of item creation. Read-only.')
      .optional(),
    description: z
      .string()
      .describe('Provides a user-visible description of the item. Optional.')
      .nullish(),
    eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
    lastModifiedBy: microsoft_graph_identitySet.optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the item was last modified. Read-only.')
      .optional(),
    name: z.string().describe('The name of the item. Read-write.').nullish(),
    parentReference: microsoft_graph_itemReference.optional(),
    webUrl: z
      .string()
      .describe(
        'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
      )
      .nullish(),
    createdByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
    lastModifiedByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
  })
  .passthrough();
const microsoft_graph_site = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    name: z.string().describe('The name of the item. Read-write.').nullish(),
    displayName: z.string().describe('The full title for the site. Read-only.').nullish(),
    description: z
      .string()
      .describe('Provides a user-visible description of the item. Optional.')
      .nullish(),
    createdDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time of item creation. Read-only.')
      .optional(),
    lastModifiedDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe('Date and time the item was last modified. Read-only.')
      .optional(),
    error: microsoft_graph_publicError.optional(),
    createdBy: microsoft_graph_identitySet.optional(),
    eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
    lastModifiedBy: microsoft_graph_identitySet.optional(),
    parentReference: microsoft_graph_itemReference.optional(),
    webUrl: z
      .string()
      .describe(
        'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
      )
      .nullish(),
    createdByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
    lastModifiedByUser: microsoft_graph_user
      .describe('[Note: Simplified from 136 properties to 25 most common ones]')
      .optional(),
    isPersonalSite: z
      .boolean()
      .describe('Identifies whether the site is personal or not. Read-only.')
      .nullish(),
    root: microsoft_graph_root.optional(),
    sharepointIds: microsoft_graph_sharepointIds.optional(),
    siteCollection: microsoft_graph_siteCollection.optional(),
    analytics: microsoft_graph_itemAnalytics.optional(),
    columns: z
      .array(microsoft_graph_columnDefinition)
      .describe('The collection of column definitions reusable across lists under this site.')
      .optional(),
    contentTypes: z
      .array(microsoft_graph_contentType)
      .describe('The collection of content types defined for this site.')
      .optional(),
    drive: microsoft_graph_drive.optional(),
    drives: z
      .array(microsoft_graph_drive)
      .describe('The collection of drives (document libraries) under this site.')
      .optional(),
    externalColumns: z.array(microsoft_graph_columnDefinition).optional(),
    items: z
      .array(microsoft_graph_baseItem)
      .describe(
        "Used to address any item contained in this site. This collection can't be enumerated."
      )
      .optional(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_siteCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_site),
  })
  .partial()
  .passthrough();
const microsoft_graph_baseItemCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_baseItem),
  })
  .partial()
  .passthrough();
const microsoft_graph_listCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_list),
  })
  .partial()
  .passthrough();
const microsoft_graph_columnDefinitionCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_columnDefinition),
  })
  .partial()
  .passthrough();
const microsoft_graph_listItemCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_listItem),
  })
  .partial()
  .passthrough();
const microsoft_graph_endpointType = z.enum([
  'default',
  'voicemail',
  'skypeForBusiness',
  'skypeForBusinessVoipPhone',
  'unknownFutureValue',
]);
const microsoft_graph_communicationsIdentitySet = z
  .object({
    application: microsoft_graph_identity.optional(),
    device: microsoft_graph_identity.optional(),
    user: microsoft_graph_identity.optional(),
    applicationInstance: microsoft_graph_identity.optional(),
    assertedIdentity: microsoft_graph_identity.optional(),
    azureCommunicationServicesUser: microsoft_graph_identity.optional(),
    encrypted: microsoft_graph_identity.optional(),
    endpointType: microsoft_graph_endpointType.optional(),
    guest: microsoft_graph_identity.optional(),
    onPremises: microsoft_graph_identity.optional(),
    phone: microsoft_graph_identity.optional(),
  })
  .passthrough();
const microsoft_graph_virtualEventSettings = z
  .object({
    isAttendeeEmailNotificationEnabled: z
      .boolean()
      .describe('Indicates whether virtual event attendees receive email notifications.')
      .nullish(),
  })
  .passthrough();
const microsoft_graph_virtualEventStatus = z.enum([
  'draft',
  'published',
  'canceled',
  'unknownFutureValue',
]);
const microsoft_graph_virtualEventPresenterDetails = z
  .object({
    bio: microsoft_graph_itemBody.optional(),
    company: z.string().describe("The presenter's company name.").nullish(),
    jobTitle: z.string().describe("The presenter's job title.").nullish(),
    linkedInProfileWebUrl: z.string().describe("The presenter's LinkedIn profile URL.").nullish(),
    personalSiteWebUrl: z.string().describe("The presenter's personal website URL.").nullish(),
    photo: z.string().describe("The content stream of the presenter's photo.").nullish(),
    twitterProfileWebUrl: z.string().describe("The presenter's Twitter profile URL.").nullish(),
  })
  .passthrough();
const microsoft_graph_virtualEventPresenter = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    email: z.string().describe('Email address of the presenter.').nullish(),
    identity: microsoft_graph_identity.optional(),
    presenterDetails: microsoft_graph_virtualEventPresenterDetails.optional(),
  })
  .passthrough();
const microsoft_graph_virtualEventSession = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    subject: z.string().describe('The subject of the online meeting.').nullish(),
    allowAttendeeToEnableCamera: z
      .boolean()
      .describe('Indicates whether attendees can turn on their camera.')
      .nullish(),
    allowAttendeeToEnableMic: z
      .boolean()
      .describe('Indicates whether attendees can turn on their microphone.')
      .nullish(),
    allowBreakoutRooms: z
      .boolean()
      .describe('Indicates whether breakout rooms are enabled for the meeting.')
      .nullish(),
    allowCopyingAndSharingMeetingContent: z
      .boolean()
      .describe(
        'Indicates whether the ability to copy and share meeting content is enabled for the meeting.'
      )
      .nullish(),
    allowedLobbyAdmitters: microsoft_graph_allowedLobbyAdmitterRoles.optional(),
    allowedPresenters: microsoft_graph_onlineMeetingPresenters.optional(),
    allowLiveShare: microsoft_graph_meetingLiveShareOptions.optional(),
    allowMeetingChat: microsoft_graph_meetingChatMode.optional(),
    allowParticipantsToChangeName: z
      .boolean()
      .describe(
        'Specifies if participants are allowed to rename themselves in an instance of the meeting.'
      )
      .nullish(),
    allowPowerPointSharing: z
      .boolean()
      .describe('Indicates whether PowerPoint live is enabled for the meeting.')
      .nullish(),
    allowRecording: z
      .boolean()
      .describe('Indicates whether recording is enabled for the meeting.')
      .nullish(),
    allowTeamworkReactions: z
      .boolean()
      .describe('Indicates if Teams reactions are enabled for the meeting.')
      .nullish(),
    allowTranscription: z
      .boolean()
      .describe('Indicates whether transcription is enabled for the meeting.')
      .nullish(),
    allowWhiteboard: z
      .boolean()
      .describe('Indicates whether whiteboard is enabled for the meeting.')
      .nullish(),
    audioConferencing: microsoft_graph_audioConferencing.optional(),
    chatInfo: microsoft_graph_chatInfo.optional(),
    chatRestrictions: microsoft_graph_chatRestrictions.optional(),
    expiryDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Indicates the date and time when the meeting resource expires. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    isEndToEndEncryptionEnabled: z
      .boolean()
      .describe('Indicates whether end-to-end encryption (E2EE) is enabled for the online meeting.')
      .nullish(),
    isEntryExitAnnounced: z
      .boolean()
      .describe('Indicates whether to announce when callers join or leave.')
      .nullish(),
    joinInformation: microsoft_graph_itemBody.optional(),
    joinMeetingIdSettings: microsoft_graph_joinMeetingIdSettings.optional(),
    joinWebUrl: z.string().describe('The join URL of the online meeting. Read-only.').nullish(),
  })
  .passthrough()
  .passthrough();
const microsoft_graph_meetingAudience = z.enum(['everyone', 'organization', 'unknownFutureValue']);
const microsoft_graph_communicationsUserIdentity = z
  .object({
    displayName: z
      .string()
      .describe(
        "The display name of the identity.For drive items, the display name might not always be available or up to date. For example, if a user changes their display name the API might show the new value in a future response, but the items associated with the user don't show up as changed when using delta."
      )
      .nullish(),
    id: z
      .string()
      .describe(
        "Unique identifier for the identity or actor. For example, in the access reviews decisions API, this property might record the id of the principal, that is, the group, user, or application that's subject to review."
      )
      .nullish(),
    tenantId: z.string().describe("The user's tenant ID.").nullish(),
  })
  .passthrough();
const microsoft_graph_virtualEventRegistrationQuestionBase = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    displayName: z.string().describe('Display name of the registration question.').nullish(),
    isRequired: z
      .boolean()
      .describe(
        'Indicates whether an answer to the question is required. The default value is false.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_virtualEventWebinarRegistrationConfiguration = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    capacity: z
      .number()
      .gte(-2147483648)
      .lte(2147483647)
      .describe('Total capacity of the virtual event.')
      .nullish(),
    registrationWebUrl: z.string().describe('Registration URL of the virtual event.').nullish(),
    questions: z
      .array(microsoft_graph_virtualEventRegistrationQuestionBase)
      .describe('Registration questions.')
      .optional(),
    isManualApprovalEnabled: z.boolean().nullish(),
    isWaitlistEnabled: z.boolean().nullish(),
  })
  .passthrough();
const microsoft_graph_virtualEventRegistrationQuestionAnswer = z
  .object({
    booleanValue: z
      .boolean()
      .describe(
        'Boolean answer of the virtual event registration question. Only appears when answerInputType is boolean.'
      )
      .nullish(),
    displayName: z.string().describe('Display name of the registration question.').nullish(),
    multiChoiceValues: z
      .array(z.string().nullable())
      .describe(
        'Collection of text answer of the virtual event registration question. Only appears when answerInputType is multiChoice.'
      )
      .optional(),
    questionId: z.string().describe('id of the virtual event registration question.').nullish(),
    value: z
      .string()
      .describe(
        'Text answer of the virtual event registration question. Appears when answerInputType is text, multilineText or singleChoice.'
      )
      .nullish(),
  })
  .passthrough();
const microsoft_graph_virtualEventAttendeeRegistrationStatus = z.enum([
  'registered',
  'canceled',
  'waitlisted',
  'pendingApproval',
  'rejectedByOrganizer',
  'unknownFutureValue',
]);
const microsoft_graph_virtualEventRegistration = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    cancelationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time when the registrant cancels their registration for the virtual event. Only appears when applicable. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    email: z.string().describe('Email address of the registrant.').nullish(),
    externalRegistrationInformation:
      microsoft_graph_virtualEventExternalRegistrationInformation.optional(),
    firstName: z.string().describe('First name of the registrant.').nullish(),
    lastName: z.string().describe('Last name of the registrant.').nullish(),
    preferredLanguage: z.string().describe("The registrant's preferred language.").nullish(),
    preferredTimezone: z.string().describe("The registrant's time zone details.").nullish(),
    registrationDateTime: z
      .string()
      .regex(
        /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
      )
      .datetime({ offset: true })
      .describe(
        'Date and time when the registrant registers for the virtual event. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
      )
      .nullish(),
    registrationQuestionAnswers: z
      .array(microsoft_graph_virtualEventRegistrationQuestionAnswer)
      .describe("The registrant's answer to the registration questions.")
      .optional(),
    status: microsoft_graph_virtualEventAttendeeRegistrationStatus.optional(),
    userId: z
      .string()
      .describe(
        "The registrant's ID in Microsoft Entra ID. Only appears when the registrant is registered in Microsoft Entra ID."
      )
      .nullish(),
    sessions: z
      .array(microsoft_graph_virtualEventSession)
      .describe('Sessions for a registration.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_virtualEventWebinar = z
  .object({
    id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
    createdBy: microsoft_graph_communicationsIdentitySet.optional(),
    description: microsoft_graph_itemBody.optional(),
    displayName: z.string().describe('The display name of the virtual event.').nullish(),
    endDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    externalEventInformation: z
      .array(microsoft_graph_virtualEventExternalInformation)
      .describe(
        'The external information of a virtual event. Returned only for event organizers or coorganizers; otherwise, null.'
      )
      .optional(),
    settings: microsoft_graph_virtualEventSettings.optional(),
    startDateTime: microsoft_graph_dateTimeTimeZone.optional(),
    status: microsoft_graph_virtualEventStatus.optional(),
    presenters: z
      .array(microsoft_graph_virtualEventPresenter)
      .describe('The virtual event presenters.')
      .optional(),
    sessions: z
      .array(microsoft_graph_virtualEventSession)
      .describe('The sessions for the virtual event.')
      .optional(),
    audience: microsoft_graph_meetingAudience.optional(),
    coOrganizers: z
      .array(microsoft_graph_communicationsUserIdentity)
      .describe('Identity information of coorganizers of the webinar.')
      .optional(),
    registrationConfiguration:
      microsoft_graph_virtualEventWebinarRegistrationConfiguration.optional(),
    registrations: z
      .array(microsoft_graph_virtualEventRegistration)
      .describe('Registration records of the webinar.')
      .optional(),
  })
  .passthrough();
const microsoft_graph_virtualEventSessionCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_virtualEventSession),
  })
  .partial()
  .passthrough();
const microsoft_graph_subscriptionCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_subscription),
  })
  .partial()
  .passthrough();
const microsoft_graph_channelCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_channel),
  })
  .partial()
  .passthrough();
const microsoft_graph_teamsTabCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_teamsTab),
  })
  .partial()
  .passthrough();
const microsoft_graph_userCollectionResponse = z
  .object({
    '@odata.count': z.number().int().nullable(),
    '@odata.nextLink': z.string().nullable(),
    value: z.array(microsoft_graph_user),
  })
  .partial()
  .passthrough();

export const schemas = {
  microsoft_graph_chatType,
  microsoft_graph_migrationMode,
  microsoft_graph_teamworkUserIdentityType,
  microsoft_graph_teamworkUserIdentity,
  microsoft_graph_teamworkOnlineMeetingInfo,
  microsoft_graph_chatViewpoint,
  microsoft_graph_teamsAppResourceSpecificPermissionType,
  microsoft_graph_teamsAppResourceSpecificPermission,
  microsoft_graph_teamsAppPermissionSet,
  microsoft_graph_teamsAppDistributionMethod,
  microsoft_graph_teamsAppAuthorization,
  microsoft_graph_identity,
  microsoft_graph_identitySet,
  microsoft_graph_teamsAppPublishingState,
  microsoft_graph_teamworkBot,
  microsoft_graph_teamsAppDefinition,
  microsoft_graph_teamsApp,
  microsoft_graph_teamsAppInstallation,
  microsoft_graph_bodyType,
  microsoft_graph_itemBody,
  microsoft_graph_eventMessageDetail,
  microsoft_graph_chatMessageFromIdentitySet,
  microsoft_graph_chatMessageType,
  microsoft_graph_chatMessageInfo,
  microsoft_graph_conversationMember,
  microsoft_graph_chatMessageAttachment,
  microsoft_graph_channelIdentity,
  microsoft_graph_chatMessageImportance,
  microsoft_graph_teamworkConversationIdentityType,
  microsoft_graph_teamworkConversationIdentity,
  microsoft_graph_chatMessageMentionedIdentitySet,
  microsoft_graph_chatMessageMention,
  microsoft_graph_chatMessageActions,
  microsoft_graph_chatMessageReactionIdentitySet,
  microsoft_graph_chatMessageReaction,
  microsoft_graph_chatMessageHistoryItem,
  microsoft_graph_chatMessagePolicyViolationDlpActionTypes,
  microsoft_graph_chatMessagePolicyViolationPolicyTip,
  microsoft_graph_chatMessagePolicyViolationUserActionTypes,
  microsoft_graph_chatMessagePolicyViolationVerdictDetailsTypes,
  microsoft_graph_chatMessagePolicyViolation,
  microsoft_graph_chatMessageHostedContent,
  microsoft_graph_chatMessage,
  microsoft_graph_resourceSpecificPermissionGrant,
  microsoft_graph_pinnedChatMessageInfo,
  microsoft_graph_teamsTabConfiguration,
  microsoft_graph_teamsTab,
  microsoft_graph_targetedChatMessage,
  microsoft_graph_chat,
  microsoft_graph_ODataErrors_ErrorDetails,
  microsoft_graph_ODataErrors_InnerError,
  microsoft_graph_ODataErrors_MainError,
  microsoft_graph_ODataErrors_ODataError,
  microsoft_graph_conversationMemberCollectionResponse,
  microsoft_graph_chatMessageCollectionResponse,
  microsoft_graph_chatMessageHostedContentCollectionResponse,
  microsoft_graph_pinnedChatMessageInfoCollectionResponse,
  get_presences_by_user_id_Body,
  BaseCollectionPaginationCountResponse,
  microsoft_graph_outOfOfficeSettings,
  microsoft_graph_dateTimeTimeZone,
  microsoft_graph_presenceStatusMessage,
  microsoft_graph_workLocationSource,
  microsoft_graph_workLocationType,
  microsoft_graph_userWorkLocation,
  microsoft_graph_presence,
  microsoft_graph_geoCoordinates,
  microsoft_graph_sharepointIds,
  microsoft_graph_itemReference,
  microsoft_graph_assignedLicense,
  microsoft_graph_assignedPlan,
  microsoft_graph_authorizationInfo,
  microsoft_graph_customSecurityAttributeValue,
  microsoft_graph_user,
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
  microsoft_graph_driveItem,
  microsoft_graph_driveItemCollectionResponse,
  copy_drive_item_Body,
  create_drive_item_share_link_Body,
  microsoft_graph_sharePointGroupIdentity,
  microsoft_graph_sharePointIdentity,
  microsoft_graph_sharePointIdentitySet,
  microsoft_graph_sharingInvitation,
  microsoft_graph_sharingLink,
  microsoft_graph_permission,
  create_upload_session_Body,
  microsoft_graph_uploadSession,
  BaseDeltaFunctionResponse,
  microsoft_graph_sensitivityLabelAssignmentMethod,
  microsoft_graph_sensitivityLabelAssignment,
  microsoft_graph_extractSensitivityLabelsResult,
  share_drive_item_Body,
  ReferenceNumeric,
  create_drive_item_preview_Body,
  microsoft_graph_itemPreviewInfo,
  microsoft_graph_permissionCollectionResponse,
  microsoft_graph_thumbnail,
  microsoft_graph_thumbnailSet,
  microsoft_graph_thumbnailSetCollectionResponse,
  microsoft_graph_publicationFacet,
  microsoft_graph_driveItemVersion,
  microsoft_graph_driveItemVersionCollectionResponse,
  microsoft_graph_workbookIcon,
  microsoft_graph_workbookFilterCriteria,
  microsoft_graph_workbookFilter,
  microsoft_graph_workbookTableColumn,
  microsoft_graph_workbookTableRow,
  microsoft_graph_workbookSortField,
  microsoft_graph_workbookTableSort,
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
  microsoft_graph_workbookNamedItem,
  microsoft_graph_workbookPivotTable,
  microsoft_graph_workbookWorksheetProtectionOptions,
  microsoft_graph_workbookWorksheetProtection,
  microsoft_graph_workbookWorksheet,
  microsoft_graph_workbookTable,
  microsoft_graph_workbookTableCollectionResponse,
  microsoft_graph_workbookTableRowCollectionResponse,
  microsoft_graph_workbookWorksheetCollectionResponse,
  create_excel_chart_Body,
  microsoft_graph_workbookRangeSort,
  microsoft_graph_workbookRangeBorder,
  microsoft_graph_workbookRangeFill,
  microsoft_graph_workbookRangeFont,
  microsoft_graph_workbookFormatProtection,
  microsoft_graph_workbookRangeFormat,
  microsoft_graph_workbookRange,
  create_excel_table_Body,
  microsoft_graph_assignedLabel,
  microsoft_graph_licenseProcessingState,
  microsoft_graph_group,
  microsoft_graph_groupCollectionResponse,
  microsoft_graph_eventType,
  microsoft_graph_attachment,
  microsoft_graph_singleValueLegacyExtendedProperty,
  microsoft_graph_multiValueLegacyExtendedProperty,
  microsoft_graph_physicalAddress,
  microsoft_graph_outlookGeoCoordinates,
  microsoft_graph_locationType,
  microsoft_graph_locationUniqueIdType,
  microsoft_graph_location,
  microsoft_graph_freeBusyStatus,
  microsoft_graph_sensitivity,
  microsoft_graph_importance,
  microsoft_graph_emailAddress,
  microsoft_graph_attendeeType,
  microsoft_graph_timeSlot,
  microsoft_graph_responseType,
  microsoft_graph_responseStatus,
  microsoft_graph_attendee,
  microsoft_graph_dayOfWeek,
  microsoft_graph_weekIndex,
  microsoft_graph_recurrencePatternType,
  microsoft_graph_recurrencePattern,
  microsoft_graph_recurrenceRangeType,
  microsoft_graph_recurrenceRange,
  microsoft_graph_patternedRecurrence,
  microsoft_graph_event,
  microsoft_graph_eventCollectionResponse,
  microsoft_graph_recipient,
  microsoft_graph_extension,
  microsoft_graph_post,
  microsoft_graph_conversationThread,
  microsoft_graph_conversation,
  microsoft_graph_conversationCollectionResponse,
  microsoft_graph_directoryObject,
  microsoft_graph_directoryObjectCollectionResponse,
  ReferenceCreate,
  microsoft_graph_conversationThreadCollectionResponse,
  reply_to_group_thread_Body,
  microsoft_graph_calendarRoleType,
  microsoft_graph_calendarPermission,
  microsoft_graph_calendarPermissionCollectionResponse,
  get_schedule_Body,
  microsoft_graph_freeBusyError,
  microsoft_graph_scheduleItem,
  microsoft_graph_timeZoneBase,
  microsoft_graph_workingHours,
  microsoft_graph_scheduleInformation,
  microsoft_graph_onlineMeetingProviderType,
  microsoft_graph_calendarColor,
  microsoft_graph_calendar,
  microsoft_graph_calendarCollectionResponse,
  microsoft_graph_chatCollectionResponse,
  microsoft_graph_contact,
  microsoft_graph_contactFolder,
  microsoft_graph_contactFolderCollectionResponse,
  microsoft_graph_contactCollectionResponse,
  microsoft_graph_labelActionSource,
  microsoft_graph_usageRights,
  microsoft_graph_usageRightsIncluded,
  microsoft_graph_sensitivityLabel,
  microsoft_graph_sensitivityLabelCollectionResponse,
  microsoft_graph_storagePlanInformation,
  microsoft_graph_quota,
  microsoft_graph_systemFacet,
  microsoft_graph_listInfo,
  microsoft_graph_columnTypes,
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
  microsoft_graph_columnDefinition,
  microsoft_graph_contentTypeInfo,
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
  microsoft_graph_fieldValueSet,
  microsoft_graph_documentSetVersionItem,
  microsoft_graph_documentSetVersion,
  microsoft_graph_listItemVersion,
  microsoft_graph_listItem,
  microsoft_graph_longRunningOperationStatus,
  microsoft_graph_publicErrorDetail,
  microsoft_graph_publicInnerError,
  microsoft_graph_publicError,
  microsoft_graph_richLongRunningOperation,
  microsoft_graph_subscription,
  microsoft_graph_list,
  microsoft_graph_drive,
  microsoft_graph_driveCollectionResponse,
  accept_calendar_event_Body,
  decline_calendar_event_Body,
  forward_calendar_event_Body,
  snooze_calendar_event_reminder_Body,
  microsoft_graph_inferenceClassificationType,
  microsoft_graph_inferenceClassificationOverride,
  microsoft_graph_inferenceClassificationOverrideCollectionResponse,
  microsoft_graph_resourceReference,
  microsoft_graph_resourceVisualization,
  microsoft_graph_entity,
  microsoft_graph_trending,
  microsoft_graph_trendingCollectionResponse,
  microsoft_graph_giphyRatingType,
  microsoft_graph_teamFunSettings,
  microsoft_graph_teamGuestSettings,
  microsoft_graph_teamMemberSettings,
  microsoft_graph_teamMessagingSettings,
  microsoft_graph_teamSpecialization,
  microsoft_graph_teamSummary,
  microsoft_graph_teamVisibilityType,
  microsoft_graph_channelLayoutType,
  microsoft_graph_channelMembershipType,
  microsoft_graph_channelSummary,
  microsoft_graph_sharedWithChannelTeamInfo,
  microsoft_graph_channel,
  microsoft_graph_operationError,
  microsoft_graph_teamsAsyncOperationType,
  microsoft_graph_teamsAsyncOperationStatus,
  microsoft_graph_teamsAsyncOperation,
  microsoft_graph_team,
  microsoft_graph_teamCollectionResponse,
  microsoft_graph_externalAudienceScope,
  microsoft_graph_automaticRepliesStatus,
  microsoft_graph_automaticRepliesSetting,
  microsoft_graph_delegateMeetingMessageDeliveryOptions,
  microsoft_graph_localeInfo,
  microsoft_graph_userPurpose,
  microsoft_graph_mailboxSettings,
  microsoft_graph_messageRuleActions,
  microsoft_graph_messageActionFlag,
  microsoft_graph_messageRulePredicates,
  microsoft_graph_messageRule,
  microsoft_graph_followupFlagStatus,
  microsoft_graph_followupFlag,
  microsoft_graph_internetMessageHeader,
  microsoft_graph_message,
  microsoft_graph_mailFolder,
  microsoft_graph_mailFolderCollectionResponse,
  microsoft_graph_messageRuleCollectionResponse,
  microsoft_graph_messageCollectionResponse,
  microsoft_graph_attachmentCollectionResponse,
  create_forward_draft_Body,
  create_reply_draft_Body,
  microsoft_graph_attendeeBase,
  microsoft_graph_locationConstraintItem,
  microsoft_graph_locationConstraint,
  microsoft_graph_activityDomain,
  microsoft_graph_timeConstraint,
  find_meeting_times_Body,
  microsoft_graph_mailTipsType,
  get_mail_tips_Body,
  send_mail_Body,
  microsoft_graph_externalLink,
  microsoft_graph_notebookLinks,
  microsoft_graph_onenoteUserRole,
  microsoft_graph_sectionLinks,
  microsoft_graph_pageLinks,
  microsoft_graph_onenotePage,
  microsoft_graph_onenoteSection,
  microsoft_graph_sectionGroup,
  microsoft_graph_notebook,
  microsoft_graph_notebookCollectionResponse,
  microsoft_graph_onenoteSectionCollectionResponse,
  microsoft_graph_CopyNotebookModel,
  microsoft_graph_onenotePageCollectionResponse,
  microsoft_graph_sectionGroupCollectionResponse,
  microsoft_graph_allowedLobbyAdmitterRoles,
  microsoft_graph_onlineMeetingPresenters,
  microsoft_graph_meetingLiveShareOptions,
  microsoft_graph_meetingChatMode,
  microsoft_graph_audioConferencing,
  microsoft_graph_chatInfo,
  microsoft_graph_chatRestrictions,
  microsoft_graph_joinMeetingIdSettings,
  microsoft_graph_onlineMeeting,
  microsoft_graph_onlineMeetingCollectionResponse,
  microsoft_graph_virtualEventExternalInformation,
  microsoft_graph_attendanceInterval,
  microsoft_graph_virtualEventExternalRegistrationInformation,
  microsoft_graph_attendanceRecord,
  microsoft_graph_meetingAttendanceReport,
  microsoft_graph_meetingAttendanceReportCollectionResponse,
  microsoft_graph_attendanceRecordCollectionResponse,
  microsoft_graph_callRecording,
  microsoft_graph_callRecordingCollectionResponse,
  microsoft_graph_callTranscript,
  microsoft_graph_callTranscriptCollectionResponse,
  microsoft_graph_categoryColor,
  microsoft_graph_outlookCategory,
  microsoft_graph_outlookCategoryCollectionResponse,
  microsoft_graph_timeZoneInformation,
  microsoft_graph_personType,
  microsoft_graph_phoneType,
  microsoft_graph_phone,
  microsoft_graph_selectionLikelihoodInfo,
  microsoft_graph_scoredEmailAddress,
  microsoft_graph_websiteType,
  microsoft_graph_website,
  microsoft_graph_person,
  microsoft_graph_personCollectionResponse,
  microsoft_graph_plannerChecklistItems,
  microsoft_graph_plannerPreviewType,
  microsoft_graph_plannerExternalReferences,
  microsoft_graph_plannerTaskDetails,
  microsoft_graph_plannerAppliedCategories,
  microsoft_graph_plannerAssignments,
  microsoft_graph_plannerOrderHintsByAssignee,
  microsoft_graph_plannerAssignedToTaskBoardTaskFormat,
  microsoft_graph_plannerBucketTaskBoardTaskFormat,
  microsoft_graph_plannerTask,
  microsoft_graph_plannerTaskCollectionResponse,
  set_my_presence_Body,
  set_my_status_message_Body,
  set_my_user_preferred_presence_Body,
  microsoft_graph_associatedTeamInfo,
  microsoft_graph_associatedTeamInfoCollectionResponse,
  microsoft_graph_userScopeTeamsAppInstallation,
  microsoft_graph_userScopeTeamsAppInstallationCollectionResponse,
  send_my_activity_notification_Body,
  microsoft_graph_wellknownListName,
  microsoft_graph_taskStatus,
  microsoft_graph_attachmentBase,
  microsoft_graph_attachmentSession,
  microsoft_graph_checklistItem,
  microsoft_graph_linkedResource,
  microsoft_graph_todoTask,
  microsoft_graph_todoTaskList,
  microsoft_graph_todoTaskListCollectionResponse,
  microsoft_graph_todoTaskCollectionResponse,
  microsoft_graph_linkedResourceCollectionResponse,
  microsoft_graph_checkInMethod,
  microsoft_graph_checkInClaim,
  microsoft_graph_place,
  microsoft_graph_bookingType,
  microsoft_graph_placeFeatureEnablement,
  microsoft_graph_room,
  microsoft_graph_placeMode,
  microsoft_graph_workspace,
  microsoft_graph_roomList,
  microsoft_graph_roomCollectionResponse,
  microsoft_graph_plannerBucket,
  microsoft_graph_plannerContainerType,
  microsoft_graph_plannerPlanContainer,
  microsoft_graph_plannerCategoryDescriptions,
  microsoft_graph_plannerUserIds,
  microsoft_graph_plannerPlanDetails,
  microsoft_graph_plannerPlan,
  microsoft_graph_plannerBucketCollectionResponse,
  microsoft_graph_bucketAggregationRange,
  microsoft_graph_bucketAggregationSortProperty,
  microsoft_graph_bucketAggregationDefinition,
  microsoft_graph_aggregationOption,
  microsoft_graph_collapseProperty,
  microsoft_graph_entityType,
  microsoft_graph_searchQuery,
  microsoft_graph_searchAlterationOptions,
  microsoft_graph_resultTemplateOption,
  microsoft_graph_searchContent,
  microsoft_graph_sharePointOneDriveOptions,
  microsoft_graph_sortProperty,
  microsoft_graph_searchRequest,
  search_query_Body,
  microsoft_graph_searchBucket,
  microsoft_graph_searchAggregation,
  microsoft_graph_searchHit,
  microsoft_graph_searchHitsContainer,
  microsoft_graph_alteredQueryToken,
  microsoft_graph_searchAlteration,
  microsoft_graph_searchAlterationType,
  microsoft_graph_alterationResponse,
  microsoft_graph_resultTemplateDictionary,
  microsoft_graph_searchResponse,
  microsoft_graph_root,
  microsoft_graph_siteArchiveStatus,
  microsoft_graph_siteArchivalDetails,
  microsoft_graph_siteCollection,
  microsoft_graph_baseItem,
  microsoft_graph_site,
  microsoft_graph_siteCollectionResponse,
  microsoft_graph_baseItemCollectionResponse,
  microsoft_graph_listCollectionResponse,
  microsoft_graph_columnDefinitionCollectionResponse,
  microsoft_graph_listItemCollectionResponse,
  microsoft_graph_endpointType,
  microsoft_graph_communicationsIdentitySet,
  microsoft_graph_virtualEventSettings,
  microsoft_graph_virtualEventStatus,
  microsoft_graph_virtualEventPresenterDetails,
  microsoft_graph_virtualEventPresenter,
  microsoft_graph_virtualEventSession,
  microsoft_graph_meetingAudience,
  microsoft_graph_communicationsUserIdentity,
  microsoft_graph_virtualEventRegistrationQuestionBase,
  microsoft_graph_virtualEventWebinarRegistrationConfiguration,
  microsoft_graph_virtualEventRegistrationQuestionAnswer,
  microsoft_graph_virtualEventAttendeeRegistrationStatus,
  microsoft_graph_virtualEventRegistration,
  microsoft_graph_virtualEventWebinar,
  microsoft_graph_virtualEventSessionCollectionResponse,
  microsoft_graph_subscriptionCollectionResponse,
  microsoft_graph_channelCollectionResponse,
  microsoft_graph_teamsTabCollectionResponse,
  microsoft_graph_userCollectionResponse,
};

const endpoints = makeApi([
  {
    method: 'post',
    path: '/$batch',
    alias: 'graph-batch',
    description: `Combine up to 20 Graph requests into a single HTTP call. Body: { requests: [{ id: '1', method: 'GET'|'POST'|'PATCH'|'DELETE', url: '/me/messages?$top=5', headers?: {...}, body?: {...}, dependsOn?: ['1'] }, ...] }. Returns { responses: [{ id, status, body, headers }] } in arbitrary order — match by id. Use cases: (1) parallelize many small reads (e.g. fetch 15 mail messages by id in one round-trip); (2) sequence dependent writes via dependsOn; (3) batch many Excel range writes into one call to dramatically reduce latency on large workbook builds. Note: each sub-request URL is relative to the Graph version root (/me/..., /drives/..., NOT https://graph.microsoft.com/v1.0/...).`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Operation payload`,
        type: 'Body',
        schema: z.object({}).partial().passthrough().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/chats',
    alias: 'create-chat',
    description: `Create a new chat object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New entity`,
        type: 'Body',
        schema: microsoft_graph_chat,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/chats/:chatId',
    alias: 'get-chat',
    description: `Retrieve a single chat (without its messages). This method supports federation. To access a chat, at least one chat member must belong to the tenant the request initiated from.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/chats/:chatId/members',
    alias: 'list-chat-members',
    description: `List all conversation members in a chat or channel.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/chats/:chatId/messages',
    alias: 'list-chat-messages',
    description: `Retrieve the list of messages in a chat. This method supports federation. To list chat messages in application context, the request must be made from the tenant that the channel owner belongs to (represented by the tenantId property on the channel).`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/chats/:chatId/messages',
    alias: 'send-chat-message',
    description: `Send a new chatMessage in the specified chat. This API can't create a new chat; you must use the list chats method to retrieve the ID of an existing chat before you can create a chat message.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_chatMessage,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/chats/:chatId/messages/:chatMessageId',
    alias: 'get-chat-message',
    description: `Retrieve a single message or a message reply in a channel or a chat.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/chats/:chatId/messages/:chatMessageId/hostedContents',
    alias: 'list-chat-message-hosted-contents',
    description: `Retrieve the list of chatMessageHostedContent objects from a message. This API only lists the hosted content objects. To get the content bytes, see get chatmessage hosted content.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/chats/:chatId/messages/:chatMessageId/replies',
    alias: 'list-chat-message-replies',
    description: `Replies for a specified message. Supports $expand for channel messages.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/chats/:chatId/messages/:chatMessageId/replies',
    alias: 'reply-to-chat-message',
    description: `Create new navigation property to replies for chats`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_chatMessage,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/chats/:chatId/messages/:chatMessageId/setReaction',
    alias: 'set-chat-message-reaction',
    description: `Invoke action setReaction`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ reactionType: z.string().nullable() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/chats/:chatId/messages/:chatMessageId/unsetReaction',
    alias: 'unset-chat-message-reaction',
    description: `Invoke action unsetReaction`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ reactionType: z.string().nullable() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/chats/:chatId/pinnedMessages',
    alias: 'list-pinned-chat-messages',
    description: `Get a list of pinnedChatMessages in a chat.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/chats/:chatId/pinnedMessages',
    alias: 'pin-chat-message',
    description: `Pin a chat message in the specified chat. This API cannot create a new chat; you must use the list chats method to retrieve the ID of an existing chat before you can pin a chat message.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_pinnedChatMessageInfo,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/chats/:chatId/pinnedMessages/:pinnedChatMessageInfoId',
    alias: 'unpin-chat-message',
    description: `Unpin a message from a chat.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/communications/getPresencesByUserId',
    alias: 'get-presences-by-user-id',
    description: `Get the presence information for multiple users.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: get_presences_by_user_id_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId',
    alias: 'get-drive-item',
    description: `All items contained in the drive. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/drives/:driveId/items/:driveItemId',
    alias: 'move-rename-onedrive-item',
    description: `Update the navigation property items in drives`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            name: z.string().describe('The name of the item. Read-write.').nullish(),
            description: z
              .string()
              .describe('Provides a user-visible description of the item. Optional.')
              .nullish(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe('Date and time of item creation. Read-only.')
              .optional(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe('Date and time the item was last modified. Read-only.')
              .optional(),
            content: z
              .string()
              .describe('The content stream, if the item represents a file.')
              .nullish(),
            location: microsoft_graph_geoCoordinates.optional(),
            createdBy: microsoft_graph_identitySet.optional(),
            eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
            lastModifiedBy: microsoft_graph_identitySet.optional(),
            parentReference: microsoft_graph_itemReference.optional(),
            webUrl: z
              .string()
              .describe(
                'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
              )
              .nullish(),
            createdByUser: microsoft_graph_user
              .describe('[Note: Simplified from 136 properties to 25 most common ones]')
              .optional(),
            lastModifiedByUser: microsoft_graph_user
              .describe('[Note: Simplified from 136 properties to 25 most common ones]')
              .optional(),
            audio: microsoft_graph_audio.optional(),
            bundle: microsoft_graph_bundle.optional(),
            cTag: z
              .string()
              .describe(
                "An eTag for the content of the item. This eTag isn't changed if only the metadata is changed. Note This property isn't returned if the item is a folder. Read-only."
              )
              .nullish(),
            deleted: microsoft_graph_deleted.optional(),
            file: microsoft_graph_file.optional(),
            fileSystemInfo: microsoft_graph_fileSystemInfo.optional(),
            folder: microsoft_graph_folder.optional(),
            image: microsoft_graph_image.optional(),
            malware: microsoft_graph_malware.optional(),
            package: microsoft_graph_package.optional(),
            pendingOperations: microsoft_graph_pendingOperations.optional(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/drives/:driveId/items/:driveItemId',
    alias: 'delete-onedrive-file',
    description: `Delete navigation property items for drives`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/children',
    alias: 'create-onedrive-folder',
    description: `Create new navigation property to children for drives`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            name: z.string().describe('The name of the item. Read-write.').nullish(),
            description: z
              .string()
              .describe('Provides a user-visible description of the item. Optional.')
              .nullish(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe('Date and time of item creation. Read-only.')
              .optional(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe('Date and time the item was last modified. Read-only.')
              .optional(),
            content: z
              .string()
              .describe('The content stream, if the item represents a file.')
              .nullish(),
            location: microsoft_graph_geoCoordinates.optional(),
            createdBy: microsoft_graph_identitySet.optional(),
            eTag: z.string().describe('ETag for the item. Read-only.').nullish(),
            lastModifiedBy: microsoft_graph_identitySet.optional(),
            parentReference: microsoft_graph_itemReference.optional(),
            webUrl: z
              .string()
              .describe(
                'URL that either displays the resource in the browser (for Office file formats), or is a direct link to the file (for other formats). Read-only.'
              )
              .nullish(),
            createdByUser: microsoft_graph_user
              .describe('[Note: Simplified from 136 properties to 25 most common ones]')
              .optional(),
            lastModifiedByUser: microsoft_graph_user
              .describe('[Note: Simplified from 136 properties to 25 most common ones]')
              .optional(),
            audio: microsoft_graph_audio.optional(),
            bundle: microsoft_graph_bundle.optional(),
            cTag: z
              .string()
              .describe(
                "An eTag for the content of the item. This eTag isn't changed if only the metadata is changed. Note This property isn't returned if the item is a folder. Read-only."
              )
              .nullish(),
            deleted: microsoft_graph_deleted.optional(),
            file: microsoft_graph_file.optional(),
            fileSystemInfo: microsoft_graph_fileSystemInfo.optional(),
            folder: microsoft_graph_folder.optional(),
            image: microsoft_graph_image.optional(),
            malware: microsoft_graph_malware.optional(),
            package: microsoft_graph_package.optional(),
            pendingOperations: microsoft_graph_pendingOperations.optional(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'put',
    path: '/drives/:driveId/items/:driveItemId/content',
    alias: 'upload-file-content',
    description: `The content stream, if the item represents a file.`,
    requestFormat: 'binary',
    parameters: [
      {
        name: 'body',
        description: `New media content.`,
        type: 'Body',
        schema: z.string().describe('Base64-encoded file content. The server decodes it and PUTs the raw bytes to Microsoft Graph.'),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/copy',
    alias: 'copy-drive-item',
    description: `Invoke action copy`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: copy_drive_item_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/createLink',
    alias: 'create-drive-item-share-link',
    description: `Create a link to share a driveItem driveItem. The createLink action creates a new sharing link if the specified link type doesn't already exist for the calling application.
If a sharing link of the specified type already exists for the app, the existing sharing link is returned. DriveItem resources inherit sharing permissions from their ancestors.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_drive_item_share_link_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/createUploadSession',
    alias: 'create-upload-session',
    description: `Invoke action createUploadSession`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_upload_session_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/delta()',
    alias: 'get-drive-delta',
    description: `Track changes in a driveItem and its children over time. Your app begins by calling delta without any parameters.
The service starts enumerating the drive's hierarchy, returning pages of items and either an @odata.nextLink or an @odata.deltaLink, as described below.
Your app should continue calling with the @odata.nextLink until you no longer see an @odata.nextLink returned, or you see a response with an empty set of changes. After you have finished receiving all the changes, you may apply them to your local state.
To check for changes in the future, call delta again with the @odata.deltaLink from the previous response. Deleted items are returned with the deleted facet.
Items with this property set should be removed from your local state.`,
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
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/extractSensitivityLabels',
    alias: 'extract-drive-item-sensitivity-labels',
    description: `Invoke action extractSensitivityLabels`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/invite',
    alias: 'share-drive-item',
    description: `Send a sharing invitation for a driveItem. A sharing invitation provides permissions to the recipients and, optionally, sends them an email to notify them that the item was shared.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: share_drive_item_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/permissions',
    alias: 'list-drive-item-permissions',
    description: `The set of permissions for the item. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'delete',
    path: '/drives/:driveId/items/:driveItemId/permissions/:permissionId',
    alias: 'delete-drive-item-permission',
    description: `Delete navigation property permissions for drives`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/preview',
    alias: 'create-drive-item-preview',
    description: `Invoke action preview`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_drive_item_preview_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/thumbnails',
    alias: 'list-drive-item-thumbnails',
    description: `Collection of thumbnailSet objects associated with the item. For more information, see getting thumbnails. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/versions',
    alias: 'list-drive-item-versions',
    description: `The list of previous versions of the item. For more info, see getting previous versions. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/workbook/tables',
    alias: 'list-excel-tables',
    description: `Represents a collection of tables associated with the workbook. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/workbook/tables/:workbookTableId',
    alias: 'get-excel-table',
    description: `Represents a collection of tables associated with the workbook. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/workbook/tables/:workbookTableId/rows',
    alias: 'list-excel-table-rows',
    description: `The list of all the rows in the table. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/workbook/tables/:workbookTableId/rows',
    alias: 'add-excel-table-rows',
    description: `Create new navigation property to rows for drives`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_workbookTableRow,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/drives/:driveId/items/:driveItemId/workbook/tables/:workbookTableId/rows/itemAt(index=:index)',
    alias: 'update-excel-table-row',
    description: `Update a single row in a formal Excel table by zero-based row index. Body: { values: [[...]] } with one inner array matching the column count.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Operation payload`,
        type: 'Body',
        schema: z.object({}).partial().passthrough().passthrough(),
      },
      {
        name: 'driveId',
        type: 'Path',
        schema: z.string().describe('Path parameter: drive-id'),
      },
      {
        name: 'driveItemId',
        type: 'Path',
        schema: z.string().describe('Path parameter: driveItem-id'),
      },
      {
        name: 'workbookTableId',
        type: 'Path',
        schema: z.string().describe('Path parameter: workbookTable-id'),
      },
      {
        name: 'index',
        type: 'Path',
        schema: z.string().describe('Path parameter: index'),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/drives/:driveId/items/:driveItemId/workbook/tables/:workbookTableId/rows/itemAt(index=:index)',
    alias: 'delete-excel-table-row',
    description: `Delete a single row from a formal Excel table by zero-based row index.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'driveId',
        type: 'Path',
        schema: z.string().describe('Path parameter: drive-id'),
      },
      {
        name: 'driveItemId',
        type: 'Path',
        schema: z.string().describe('Path parameter: driveItem-id'),
      },
      {
        name: 'workbookTableId',
        type: 'Path',
        schema: z.string().describe('Path parameter: workbookTable-id'),
      },
      {
        name: 'index',
        type: 'Path',
        schema: z.string().describe('Path parameter: index'),
      },
    ],
    response: z.void()
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
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range()/sort',
    alias: 'sort-excel-range',
    description: `Update the navigation property sort in drives`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
          })
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')`,
    alias: 'get-excel-range',
    description: `Invoke function range`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'patch',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')`,
    alias: 'update-excel-range',
    description: `Set cell values, formulas, or number format on any range — does NOT require the worksheet to be a formal Excel table. Body: { values: [['v1','v2','v3']] } for a single row, or [['a','b'],['c','d']] for multi-row. Use this for append (target the next empty row's address, e.g. 'A172:H172'), update (target a single cell like 'H42'), or prepend-style edits (read existing, concatenate, write back). Number of inner-array values must match the column count of the address.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Operation payload`,
        type: 'Body',
        schema: z.object({}).partial().passthrough().passthrough(),
      },
      {
        name: 'driveId',
        type: 'Path',
        schema: z.string().describe('Path parameter: drive-id'),
      },
      {
        name: 'driveItemId',
        type: 'Path',
        schema: z.string().describe('Path parameter: driveItem-id'),
      },
      {
        name: 'workbookWorksheetId',
        type: 'Path',
        schema: z.string().describe('Path parameter: workbookWorksheet-id'),
      },
      {
        name: 'address',
        type: 'Path',
        schema: z.string().describe('Path parameter: address'),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/clear`,
    alias: 'clear-excel-range',
    description: `Invoke action clear`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ applyTo: z.string() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/delete`,
    alias: 'delete-excel-range',
    description: `Invoke action delete`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ shift: z.string() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/format`,
    alias: 'format-excel-range',
    description: `Update the navigation property format in drives`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_workbookRangeFormat,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/insert`,
    alias: 'insert-excel-range',
    description: `Invoke action insert`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ shift: z.string() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/merge`,
    alias: 'merge-excel-range',
    description: `Invoke action merge`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z
          .object({ across: z.boolean().default(false) })
          .partial()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: `/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/range(address=':address')/unmerge`,
    alias: 'unmerge-excel-range',
    description: `Invoke action unmerge`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'post',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/tables/add',
    alias: 'create-excel-table',
    description: `Create a new table. The range source address determines the worksheet under which the table will be added. If the table can't be added (for example, because the address is invalid, or the table would overlap with another table), an error is generated.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_excel_table_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/drives/:driveId/items/:driveItemId/workbook/worksheets/:workbookWorksheetId/usedRange()',
    alias: 'get-excel-used-range',
    description: `Invoke function usedRange`,
    requestFormat: 'json',
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'get',
    path: `/drives/:driveId/search(q=':q')`,
    alias: 'search-onedrive-files',
    description: `Search the hierarchy of items for items matching a query.
You can search within a folder hierarchy, a whole drive, or files shared with the current user.`,
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
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups',
    alias: 'list-groups',
    description: `List all the groups available in an organization, excluding dynamic distribution groups. To retrieve dynamic distribution groups, use the Exchange admin center. This operation returns by default only a subset of the properties for each group. These default properties are noted in the Properties section. To get properties that are not returned by default, do a GET operation for the group and specify the properties in a $select OData query option. The hasMembersWithLicenseErrors and isArchived properties are an exception and are not returned in the $select query.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/groups',
    alias: 'create-group',
    description: `Create a new group as specified in the request body. You can create the following types of groups: This operation returns by default only a subset of the properties for each group. These default properties are noted in the Properties section. To get properties that are not returned by default, do a GET operation and specify the properties in a $select OData query option.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New entity`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            displayName: z
              .string()
              .describe(
                "The display name for the group. This property is required when a group is created and can't be cleared during updates. Maximum length is 256 characters. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values), $search, and $orderby."
              )
              .nullish(),
            description: z
              .string()
              .describe(
                'An optional description for the group. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith) and $search.'
              )
              .nullish(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Timestamp of when the group was created. The value can't be modified and is automatically populated when the group is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Read-only."
              )
              .nullish(),
            deletedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Date and time when this object was deleted. Always null when the object hasn't been deleted."
              )
              .nullish(),
            allowExternalSenders: z
              .boolean()
              .describe(
                'Indicates if people external to the organization can send messages to the group. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID}).'
              )
              .nullish(),
            assignedLabels: z
              .array(microsoft_graph_assignedLabel)
              .describe(
                'The list of sensitivity label pairs (label ID, label name) associated with a Microsoft 365 group. Requires $select to retrieve. This property can be updated only in delegated scenarios where the caller requires both the Microsoft Graph permission and a supported administrator role.'
              )
              .optional(),
            assignedLicenses: z
              .array(microsoft_graph_assignedLicense)
              .describe(
                'The licenses that are assigned to the group. Requires $select to retrieve. Supports $filter (eq). Read-only.'
              )
              .optional(),
            autoSubscribeNewMembers: z
              .boolean()
              .describe(
                "Indicates if new members added to the group are autosubscribed to receive email notifications. You can set this property in a PATCH request for the group; don't set it in the initial POST request that creates the group. Default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
              )
              .nullish(),
            classification: z
              .string()
              .describe(
                'Describes a classification for the group (such as low, medium, or high business impact). Valid values for this property are defined by creating a ClassificationList setting value, based on the template definition.Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
              )
              .nullish(),
            expirationDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Timestamp of when the group is set to expire. It's null for security groups, but for Microsoft 365 groups, it represents when the group is set to expire as defined in the groupLifecyclePolicy. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Supports $filter (eq, ne, not, ge, le, in). Read-only."
              )
              .nullish(),
            groupTypes: z
              .array(z.string())
              .describe(
                "Specifies the group type and its membership. If the collection contains Unified, the group is a Microsoft 365 group; otherwise, it's either a security group or a distribution group. For details, see groups overview.If the collection includes DynamicMembership, the group has dynamic membership; otherwise, membership is static. Returned by default. Supports $filter (eq, not)."
              )
              .optional(),
            hasMembersWithLicenseErrors: z
              .boolean()
              .describe(
                'Indicates whether there are members in this group that have license errors from its group-based license assignment. This property is never returned on a GET operation. You can use it as a $filter argument to get groups that have members with license errors (that is, filter for this property being true). See an example. Supports $filter (eq).'
              )
              .nullish(),
            hideFromAddressLists: z
              .boolean()
              .describe(
                "True if the group isn't displayed in certain parts of the Outlook UI: the Address Book, address lists for selecting message recipients, and the Browse Groups dialog for searching groups; otherwise, false. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
              )
              .nullish(),
            hideFromOutlookClients: z
              .boolean()
              .describe(
                "True if the group isn't displayed in Outlook clients, such as Outlook for Windows and Outlook on the web; otherwise, false. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
              )
              .nullish(),
            infoCatalogs: z.array(z.string()).optional(),
            isArchived: z
              .boolean()
              .describe(
                'When a group is associated with a team, this property determines whether the team is in read-only mode.To read this property, use the /group/{groupId}/team endpoint or the Get team API. To update this property, use the archiveTeam and unarchiveTeam APIs.'
              )
              .nullish(),
            isAssignableToRole: z
              .boolean()
              .describe(
                "Indicates whether this group can be assigned to a Microsoft Entra role. Optional. This property can only be set while creating the group and is immutable. If set to true, the securityEnabled property must also be set to true, visibility must be Hidden, and the group can't be a dynamic group (that is, groupTypes can't contain DynamicMembership). Only callers with at least the Privileged Role Administrator role can set this property. The caller must also be assigned the RoleManagement.ReadWrite.Directory permission to set this property or update the membership of such groups. For more, see Using a group to manage Microsoft Entra role assignmentsUsing this feature requires a Microsoft Entra ID P1 license. Returned by default. Supports $filter (eq, ne, not)."
              )
              .nullish(),
            isManagementRestricted: z
              .boolean()
              .describe(
                'Indicates whether the group is a member of a restricted management administrative unit. If not set, the default value is null and the default behavior is false. Read-only.  To manage a group member of a restricted management administrative unit, the administrator or calling app must be assigned a Microsoft Entra role at the scope of the restricted management administrative unit. Requires $select to retrieve.'
              )
              .nullish(),
            isSubscribedByMail: z
              .boolean()
              .describe(
                'Indicates whether the signed-in user is subscribed to receive email conversations. The default value is true. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID}).'
              )
              .nullish(),
            licenseProcessingState: microsoft_graph_licenseProcessingState.optional(),
            mail: z
              .string()
              .describe(
                "The SMTP address for the group, for example, 'serviceadmins@contoso.com'. Returned by default. Read-only. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
              )
              .nullish(),
            mailEnabled: z
              .boolean()
              .describe(
                'Specifies whether the group is mail-enabled. Required. Returned by default. Supports $filter (eq, ne, not).'
              )
              .nullish(),
            mailNickname: z
              .string()
              .describe(
                "The mail alias for the group, unique for Microsoft 365 groups in the organization. Maximum length is 64 characters. This property can contain only characters in the ASCII character set 0 - 127 except the following characters: @ () / [] ' ; : <> , SPACE. Required. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
              )
              .nullish(),
            membershipRule: z
              .string()
              .describe(
                'The rule that determines members for this group if the group is a dynamic group (groupTypes contains DynamicMembership). For more information about the syntax of the membership rule, see Membership Rules syntax. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups/:groupId',
    alias: 'get-group',
    description: `Get the properties and relationships of a group object. This operation returns by default only a subset of all the available properties, as noted in the Properties section. To get properties that aren't_ returned by default, specify them in a $select OData query option. The hasMembersWithLicenseErrors and isArchived properties are an exception and aren't returned in the $select query.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/groups/:groupId',
    alias: 'update-group',
    description: `Create a new group object if it doesn't exist, or update the properties of an existing group object.
You can create or update the following types of group: By default, this operation returns only a subset of the properties for each group. For a list of properties that are returned by default, see the Properties section of the group resource. To get properties that are not returned by default, do a GET operation and specify the properties in a $select OData query option.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            displayName: z
              .string()
              .describe(
                "The display name for the group. This property is required when a group is created and can't be cleared during updates. Maximum length is 256 characters. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values), $search, and $orderby."
              )
              .nullish(),
            description: z
              .string()
              .describe(
                'An optional description for the group. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith) and $search.'
              )
              .nullish(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Timestamp of when the group was created. The value can't be modified and is automatically populated when the group is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Read-only."
              )
              .nullish(),
            deletedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Date and time when this object was deleted. Always null when the object hasn't been deleted."
              )
              .nullish(),
            allowExternalSenders: z
              .boolean()
              .describe(
                'Indicates if people external to the organization can send messages to the group. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID}).'
              )
              .nullish(),
            assignedLabels: z
              .array(microsoft_graph_assignedLabel)
              .describe(
                'The list of sensitivity label pairs (label ID, label name) associated with a Microsoft 365 group. Requires $select to retrieve. This property can be updated only in delegated scenarios where the caller requires both the Microsoft Graph permission and a supported administrator role.'
              )
              .optional(),
            assignedLicenses: z
              .array(microsoft_graph_assignedLicense)
              .describe(
                'The licenses that are assigned to the group. Requires $select to retrieve. Supports $filter (eq). Read-only.'
              )
              .optional(),
            autoSubscribeNewMembers: z
              .boolean()
              .describe(
                "Indicates if new members added to the group are autosubscribed to receive email notifications. You can set this property in a PATCH request for the group; don't set it in the initial POST request that creates the group. Default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
              )
              .nullish(),
            classification: z
              .string()
              .describe(
                'Describes a classification for the group (such as low, medium, or high business impact). Valid values for this property are defined by creating a ClassificationList setting value, based on the template definition.Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
              )
              .nullish(),
            expirationDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Timestamp of when the group is set to expire. It's null for security groups, but for Microsoft 365 groups, it represents when the group is set to expire as defined in the groupLifecyclePolicy. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on January 1, 2014 is 2014-01-01T00:00:00Z. Returned by default. Supports $filter (eq, ne, not, ge, le, in). Read-only."
              )
              .nullish(),
            groupTypes: z
              .array(z.string())
              .describe(
                "Specifies the group type and its membership. If the collection contains Unified, the group is a Microsoft 365 group; otherwise, it's either a security group or a distribution group. For details, see groups overview.If the collection includes DynamicMembership, the group has dynamic membership; otherwise, membership is static. Returned by default. Supports $filter (eq, not)."
              )
              .optional(),
            hasMembersWithLicenseErrors: z
              .boolean()
              .describe(
                'Indicates whether there are members in this group that have license errors from its group-based license assignment. This property is never returned on a GET operation. You can use it as a $filter argument to get groups that have members with license errors (that is, filter for this property being true). See an example. Supports $filter (eq).'
              )
              .nullish(),
            hideFromAddressLists: z
              .boolean()
              .describe(
                "True if the group isn't displayed in certain parts of the Outlook UI: the Address Book, address lists for selecting message recipients, and the Browse Groups dialog for searching groups; otherwise, false. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
              )
              .nullish(),
            hideFromOutlookClients: z
              .boolean()
              .describe(
                "True if the group isn't displayed in Outlook clients, such as Outlook for Windows and Outlook on the web; otherwise, false. The default value is false. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID})."
              )
              .nullish(),
            infoCatalogs: z.array(z.string()).optional(),
            isArchived: z
              .boolean()
              .describe(
                'When a group is associated with a team, this property determines whether the team is in read-only mode.To read this property, use the /group/{groupId}/team endpoint or the Get team API. To update this property, use the archiveTeam and unarchiveTeam APIs.'
              )
              .nullish(),
            isAssignableToRole: z
              .boolean()
              .describe(
                "Indicates whether this group can be assigned to a Microsoft Entra role. Optional. This property can only be set while creating the group and is immutable. If set to true, the securityEnabled property must also be set to true, visibility must be Hidden, and the group can't be a dynamic group (that is, groupTypes can't contain DynamicMembership). Only callers with at least the Privileged Role Administrator role can set this property. The caller must also be assigned the RoleManagement.ReadWrite.Directory permission to set this property or update the membership of such groups. For more, see Using a group to manage Microsoft Entra role assignmentsUsing this feature requires a Microsoft Entra ID P1 license. Returned by default. Supports $filter (eq, ne, not)."
              )
              .nullish(),
            isManagementRestricted: z
              .boolean()
              .describe(
                'Indicates whether the group is a member of a restricted management administrative unit. If not set, the default value is null and the default behavior is false. Read-only.  To manage a group member of a restricted management administrative unit, the administrator or calling app must be assigned a Microsoft Entra role at the scope of the restricted management administrative unit. Requires $select to retrieve.'
              )
              .nullish(),
            isSubscribedByMail: z
              .boolean()
              .describe(
                'Indicates whether the signed-in user is subscribed to receive email conversations. The default value is true. Requires $select to retrieve. Supported only on the Get group API (GET /groups/{ID}).'
              )
              .nullish(),
            licenseProcessingState: microsoft_graph_licenseProcessingState.optional(),
            mail: z
              .string()
              .describe(
                "The SMTP address for the group, for example, 'serviceadmins@contoso.com'. Returned by default. Read-only. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
              )
              .nullish(),
            mailEnabled: z
              .boolean()
              .describe(
                'Specifies whether the group is mail-enabled. Required. Returned by default. Supports $filter (eq, ne, not).'
              )
              .nullish(),
            mailNickname: z
              .string()
              .describe(
                "The mail alias for the group, unique for Microsoft 365 groups in the organization. Maximum length is 64 characters. This property can contain only characters in the ASCII character set 0 - 127 except the following characters: @ () / [] ' ; : <> , SPACE. Required. Returned by default. Supports $filter (eq, ne, not, ge, le, in, startsWith, and eq on null values)."
              )
              .nullish(),
            membershipRule: z
              .string()
              .describe(
                'The rule that determines members for this group if the group is a dynamic group (groupTypes contains DynamicMembership). For more information about the syntax of the membership rule, see Membership Rules syntax. Returned by default. Supports $filter (eq, ne, not, ge, le, startsWith).'
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/groups/:groupId',
    alias: 'delete-group',
    description: `Delete a group. When deleted, both Microsoft 365 and security groups are moved to a temporary container and can be restored within 30 days. After that time, they're permanently deleted. This doesn't apply to Distribution groups which are permanently deleted immediately. To learn more, see deletedItems.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups/:groupId/calendarView',
    alias: 'get-group-calendar-view',
    description: `Get the occurrences, exceptions, and single instances of events in a calendar view defined by a time range,
from the default calendar of a group.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups/:groupId/conversations',
    alias: 'list-group-conversations',
    description: `Retrieve the list of conversations in this group.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups/:groupId/events',
    alias: 'list-group-events',
    description: `Retrieve a list of event objects.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups/:groupId/members',
    alias: 'list-group-members',
    description: `Get a list of the group's direct members. A group can have users, organizational contacts, devices, service principals and other groups as members. This operation is not transitive.`,
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
    response: z.void()
  },
  {
    method: 'delete',
    path: '/groups/:groupId/members/:directoryObjectId/$ref',
    alias: 'remove-group-member',
    description: `Remove a member from a group via the members navigation property. You can't remove a member from groups with dynamic memberships.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/groups/:groupId/members/$ref',
    alias: 'add-group-member',
    description: `Add a member to a security or Microsoft 365 group. When using the API to add multiple members in one request, you can add up to only 20 members.  The following table shows the types of members that can be added to either security groups or Microsoft 365 groups.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property ref value`,
        type: 'Body',
        schema: z.record(z.object({}).partial().passthrough()),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups/:groupId/owners',
    alias: 'list-group-owners',
    description: `Retrieve a list of the group's owners. The owners are a set of users or service principals who are allowed to modify the group object. Owners are currently not available in Microsoft Graph for groups that were created in Exchange, distribution groups, or groups that are synchronized from an on-premises environment.`,
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
    response: z.void()
  },
  {
    method: 'delete',
    path: '/groups/:groupId/owners/:directoryObjectId/$ref',
    alias: 'remove-group-owner',
    description: `Remove an owner from a Microsoft 365 group or a security group through the owners navigation property. Once owners are assigned to a group, the last owner (a user object) of the group cannot be removed.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/groups/:groupId/owners/$ref',
    alias: 'add-group-owner',
    description: `Add a user or service principal to a Microsoft 365 or security group's owners. The owners are a set of users or service principals who are allowed to modify the group object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property ref value`,
        type: 'Body',
        schema: z.record(z.object({}).partial().passthrough()),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/groups/:groupId/threads',
    alias: 'list-group-threads',
    description: `Get all the threads of a group.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/groups/:groupId/threads/:conversationThreadId/reply',
    alias: 'reply-to-group-thread',
    description: `Create an open extension (openTypeExtension object) and add custom properties in a new or existing instance of a resource. You can create an open extension in a resource instance and store custom data to it all in the same operation, except for specific resources. The table in the Permissions section lists the resources that support open extensions.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: reply_to_group_thread_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me',
    alias: 'get-current-user',
    description: `Retrieve the properties and relationships of user object. This operation returns by default only a subset of the more commonly used properties for each user. These default properties are noted in the Properties section. To get properties that are not returned by default, do a GET operation for the user and specify the properties in a $select OData query option. Because the user resource supports extensions, you can also use the GET operation to get custom properties and extension data in a user instance. Customers through Microsoft Entra ID for customers can also use this API operation to retrieve their details.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendar/calendarPermissions',
    alias: 'list-my-calendar-permissions',
    description: `The permissions of the users with whom the calendar is shared.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/calendar/calendarPermissions',
    alias: 'create-my-calendar-permission',
    description: `Create a calendarPermission resource to specify the identity and role of the user with whom the specified calendar is being shared or delegated.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_calendarPermission,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/calendar/calendarPermissions/:calendarPermissionId',
    alias: 'update-my-calendar-permission',
    description: `Update the navigation property calendarPermissions in me`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_calendarPermission,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/calendar/calendarPermissions/:calendarPermissionId',
    alias: 'delete-my-calendar-permission',
    description: `Delete navigation property calendarPermissions for me`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/calendar/getSchedule',
    alias: 'get-schedule',
    description: `Get the free/busy availability information for a collection of users, distributions lists, or resources (rooms or equipment) for a specified time period.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: get_schedule_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendars',
    alias: 'list-calendars',
    description: `Get all the user's calendars (/calendars navigation property), get the calendars from the default calendar group or from a specific calendar group.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/calendars',
    alias: 'create-calendar',
    description: `Create a new calendar for a user.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_calendar,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/calendars/:calendarId',
    alias: 'update-calendar',
    description: `Update the navigation property calendars in me`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_calendar,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/calendars/:calendarId',
    alias: 'delete-calendar',
    description: `Delete a calendar other than the default calendar.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendars/:calendarId/calendarView',
    alias: 'get-specific-calendar-view',
    description: `The calendar view for the calendar. Navigation property. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendars/:calendarId/events',
    alias: 'list-specific-calendar-events',
    description: `The events in the calendar. Navigation property. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/calendars/:calendarId/events',
    alias: 'create-specific-calendar-event',
    description: `Use this API to create a new event in a calendar. The calendar can be one for a user, or the default calendar of a Microsoft 365 group.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            type: microsoft_graph_eventType.optional(),
            body: microsoft_graph_itemBody.optional(),
            subject: z.string().describe("The text of the event's subject line.").nullish(),
            attachments: z
              .array(microsoft_graph_attachment)
              .describe(
                'The collection of FileAttachment, ItemAttachment, and referenceAttachment attachments for the event. Navigation property. Read-only. Nullable.'
              )
              .optional(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            start: microsoft_graph_dateTimeTimeZone.optional(),
            end: microsoft_graph_dateTimeTimeZone.optional(),
            location: microsoft_graph_location.optional(),
            showAs: microsoft_graph_freeBusyStatus.optional(),
            sensitivity: microsoft_graph_sensitivity.optional(),
            isAllDay: z
              .boolean()
              .describe(
                "Set to true if the event lasts all day. If true, regardless of whether it's a single-day or multi-day event, start, and endtime must be set to midnight and be in the same time zone."
              )
              .nullish(),
            importance: microsoft_graph_importance.optional(),
            isOnlineMeeting: z
              .boolean()
              .describe(
                'True if this event has online meeting information (that is, onlineMeeting points to an onlineMeetingInfo resource), false otherwise. Default is false (onlineMeeting is null). Optional.  After you set isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting. Subsequently, Outlook ignores any further changes to isOnlineMeeting, and the meeting remains available online.'
              )
              .nullish(),
            isReminderOn: z
              .boolean()
              .describe('Set to true if an alert is set to remind the user of the event.')
              .nullish(),
            attendees: z
              .array(microsoft_graph_attendee)
              .describe('The collection of attendees for the event.')
              .optional(),
            recurrence: microsoft_graph_patternedRecurrence.optional(),
            reminderMinutesBeforeStart: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'The number of minutes before the event start time that the reminder alert occurs.'
              )
              .nullish(),
            allowNewTimeProposals: z
              .boolean()
              .describe(
                'true if the meeting organizer allows invitees to propose a new time when responding; otherwise, false. Optional. The default is true.'
              )
              .nullish(),
            responseRequested: z
              .boolean()
              .describe(
                'Default is true, which represents the organizer would like an invitee to send a response to the event.'
              )
              .nullish(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendars/:calendarId/events/:eventId',
    alias: 'get-specific-calendar-event',
    description: `The events in the calendar. Navigation property. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/calendars/:calendarId/events/:eventId',
    alias: 'update-specific-calendar-event',
    description: `Update the navigation property events in me`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            type: microsoft_graph_eventType.optional(),
            body: microsoft_graph_itemBody.optional(),
            subject: z.string().describe("The text of the event's subject line.").nullish(),
            attachments: z
              .array(microsoft_graph_attachment)
              .describe(
                'The collection of FileAttachment, ItemAttachment, and referenceAttachment attachments for the event. Navigation property. Read-only. Nullable.'
              )
              .optional(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            start: microsoft_graph_dateTimeTimeZone.optional(),
            end: microsoft_graph_dateTimeTimeZone.optional(),
            location: microsoft_graph_location.optional(),
            showAs: microsoft_graph_freeBusyStatus.optional(),
            sensitivity: microsoft_graph_sensitivity.optional(),
            isAllDay: z
              .boolean()
              .describe(
                "Set to true if the event lasts all day. If true, regardless of whether it's a single-day or multi-day event, start, and endtime must be set to midnight and be in the same time zone."
              )
              .nullish(),
            importance: microsoft_graph_importance.optional(),
            isOnlineMeeting: z
              .boolean()
              .describe(
                'True if this event has online meeting information (that is, onlineMeeting points to an onlineMeetingInfo resource), false otherwise. Default is false (onlineMeeting is null). Optional.  After you set isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting. Subsequently, Outlook ignores any further changes to isOnlineMeeting, and the meeting remains available online.'
              )
              .nullish(),
            isReminderOn: z
              .boolean()
              .describe('Set to true if an alert is set to remind the user of the event.')
              .nullish(),
            attendees: z
              .array(microsoft_graph_attendee)
              .describe('The collection of attendees for the event.')
              .optional(),
            recurrence: microsoft_graph_patternedRecurrence.optional(),
            reminderMinutesBeforeStart: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'The number of minutes before the event start time that the reminder alert occurs.'
              )
              .nullish(),
            allowNewTimeProposals: z
              .boolean()
              .describe(
                'true if the meeting organizer allows invitees to propose a new time when responding; otherwise, false. Optional. The default is true.'
              )
              .nullish(),
            responseRequested: z
              .boolean()
              .describe(
                'Default is true, which represents the organizer would like an invitee to send a response to the event.'
              )
              .nullish(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/calendars/:calendarId/events/:eventId',
    alias: 'delete-specific-calendar-event',
    description: `Delete navigation property events for me`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendars/:calendarId/events/:eventId/instances',
    alias: 'list-calendar-event-instances',
    description: `The occurrences of a recurring series, if the event is a series master. This property includes occurrences that are part of the recurrence pattern, and exceptions modified, but doesn't include occurrences canceled from the series. Navigation property. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendarView',
    alias: 'get-calendar-view',
    description: `Get the occurrences, exceptions, and single instances of events in a calendar view defined by a time range, from the user's default calendar,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/calendarView/delta()',
    alias: 'list-calendar-view-delta',
    description: `Get a set of event resources that have been added, deleted, or updated in a calendarView (a range of events defined by start and end dates) of the user's primary calendar. Typically, synchronizing events in a calendarView in a local store entails a round of multiple delta function calls. The initial call is a full synchronization, and every subsequent delta call in the same round gets the incremental changes (additions, deletions, or updates). This allows you to maintain and synchronize a local store of events in the specified calendarView, without having to fetch all the events of that calendar from the server every time.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'startDateTime',
        type: 'Query',
        schema: z
          .string()
          .describe(
            'The start date and time of the time range in the function, represented in ISO 8601 format. For example, 2019-11-08T20:00:00-08:00'
          ),
      },
      {
        name: 'endDateTime',
        type: 'Query',
        schema: z
          .string()
          .describe(
            'The end date and time of the time range in the function, represented in ISO 8601 format. For example, 2019-11-08T20:00:00-08:00'
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
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/chats',
    alias: 'list-chats',
    description: `Get chats from me`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/contactFolders',
    alias: 'list-contact-folders',
    description: `Get the contact folder collection in the default Contacts folder of the signed-in user.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/contactFolders',
    alias: 'create-contact-folder',
    description: `Create a new contactFolder under the user's default contacts folder. You can also create a new contactfolder as a child of any specified contact folder.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_contactFolder,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/contactFolders/:contactFolderId',
    alias: 'update-contact-folder',
    description: `Update the properties of contactfolder object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_contactFolder,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/contactFolders/:contactFolderId',
    alias: 'delete-contact-folder',
    description: `Delete contactFolder other than the default contactFolder.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/contactFolders/:contactFolderId/childFolders',
    alias: 'list-contact-folder-child-folders',
    description: `Get a collection of child folders under the specified contact folder.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/contactFolders/:contactFolderId/childFolders',
    alias: 'create-contact-child-folder',
    description: `Create a new contactFolder as a child of a specified folder.  You can also create a new contactFolder under the user's default contact folder.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_contactFolder,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/contactFolders/:contactFolderId/contacts',
    alias: 'list-contact-folder-contacts',
    description: `Get a contact collection from the default Contacts folder of the signed-in user (.../me/contacts), or from the specified contact folder.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/contactFolders/:contactFolderId/contacts',
    alias: 'create-contact-in-folder',
    description: `Add a contact to the root Contacts folder or to the contacts endpoint of another contact folder.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            displayName: z
              .string()
              .describe(
                "The contact's display name. You can specify the display name in a create or update operation. Note that later updates to other properties may cause an automatically generated value to overwrite the displayName value you have specified. To preserve a pre-existing value, always include it as displayName in an update operation."
              )
              .nullish(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            title: z.string().describe("The contact's title.").nullish(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the contact. Read-only. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the contact. Read-only. Nullable.'
              )
              .optional(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
            assistantName: z.string().describe("The name of the contact's assistant.").nullish(),
            birthday: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "The contact's birthday. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
              )
              .nullish(),
            businessAddress: microsoft_graph_physicalAddress.optional(),
            businessHomePage: z
              .string()
              .describe('The business home page of the contact.')
              .nullish(),
            businessPhones: z
              .array(z.string().nullable())
              .describe("The contact's business phone numbers.")
              .optional(),
            children: z
              .array(z.string().nullable())
              .describe("The names of the contact's children.")
              .optional(),
            companyName: z.string().describe("The name of the contact's company.").nullish(),
            department: z.string().describe("The contact's department.").nullish(),
            emailAddresses: z
              .array(microsoft_graph_emailAddress)
              .describe("The contact's email addresses.")
              .optional(),
            fileAs: z.string().describe('The name the contact is filed under.').nullish(),
            generation: z.string().describe("The contact's suffix.").nullish(),
            givenName: z.string().describe("The contact's given name.").nullish(),
            homeAddress: microsoft_graph_physicalAddress.optional(),
            homePhones: z
              .array(z.string().nullable())
              .describe("The contact's home phone numbers.")
              .optional(),
            imAddresses: z
              .array(z.string().nullable())
              .describe("The contact's instant messaging (IM) addresses.")
              .optional(),
            initials: z.string().describe("The contact's initials.").nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/contacts',
    alias: 'list-outlook-contacts',
    description: `Get a contact collection from the default contacts folder of the signed-in user. There are two scenarios where an app can get contacts in another user's contact folder:`,
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
    response: z.void()
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
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            displayName: z
              .string()
              .describe(
                "The contact's display name. You can specify the display name in a create or update operation. Note that later updates to other properties may cause an automatically generated value to overwrite the displayName value you have specified. To preserve a pre-existing value, always include it as displayName in an update operation."
              )
              .nullish(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            title: z.string().describe("The contact's title.").nullish(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the contact. Read-only. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the contact. Read-only. Nullable.'
              )
              .optional(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
            assistantName: z.string().describe("The name of the contact's assistant.").nullish(),
            birthday: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "The contact's birthday. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
              )
              .nullish(),
            businessAddress: microsoft_graph_physicalAddress.optional(),
            businessHomePage: z
              .string()
              .describe('The business home page of the contact.')
              .nullish(),
            businessPhones: z
              .array(z.string().nullable())
              .describe("The contact's business phone numbers.")
              .optional(),
            children: z
              .array(z.string().nullable())
              .describe("The names of the contact's children.")
              .optional(),
            companyName: z.string().describe("The name of the contact's company.").nullish(),
            department: z.string().describe("The contact's department.").nullish(),
            emailAddresses: z
              .array(microsoft_graph_emailAddress)
              .describe("The contact's email addresses.")
              .optional(),
            fileAs: z.string().describe('The name the contact is filed under.').nullish(),
            generation: z.string().describe("The contact's suffix.").nullish(),
            givenName: z.string().describe("The contact's given name.").nullish(),
            homeAddress: microsoft_graph_physicalAddress.optional(),
            homePhones: z
              .array(z.string().nullable())
              .describe("The contact's home phone numbers.")
              .optional(),
            imAddresses: z
              .array(z.string().nullable())
              .describe("The contact's instant messaging (IM) addresses.")
              .optional(),
            initials: z.string().describe("The contact's initials.").nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/contacts/:contactId',
    alias: 'get-outlook-contact',
    description: `Retrieve the properties and relationships of a contact object. There are two scenarios where an app can get a contact in another user's contact folder:`,
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
    response: z.void()
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
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            displayName: z
              .string()
              .describe(
                "The contact's display name. You can specify the display name in a create or update operation. Note that later updates to other properties may cause an automatically generated value to overwrite the displayName value you have specified. To preserve a pre-existing value, always include it as displayName in an update operation."
              )
              .nullish(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            title: z.string().describe("The contact's title.").nullish(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the contact. Read-only. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the contact. Read-only. Nullable.'
              )
              .optional(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
            assistantName: z.string().describe("The name of the contact's assistant.").nullish(),
            birthday: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "The contact's birthday. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
              )
              .nullish(),
            businessAddress: microsoft_graph_physicalAddress.optional(),
            businessHomePage: z
              .string()
              .describe('The business home page of the contact.')
              .nullish(),
            businessPhones: z
              .array(z.string().nullable())
              .describe("The contact's business phone numbers.")
              .optional(),
            children: z
              .array(z.string().nullable())
              .describe("The names of the contact's children.")
              .optional(),
            companyName: z.string().describe("The name of the contact's company.").nullish(),
            department: z.string().describe("The contact's department.").nullish(),
            emailAddresses: z
              .array(microsoft_graph_emailAddress)
              .describe("The contact's email addresses.")
              .optional(),
            fileAs: z.string().describe('The name the contact is filed under.').nullish(),
            generation: z.string().describe("The contact's suffix.").nullish(),
            givenName: z.string().describe("The contact's given name.").nullish(),
            homeAddress: microsoft_graph_physicalAddress.optional(),
            homePhones: z
              .array(z.string().nullable())
              .describe("The contact's home phone numbers.")
              .optional(),
            imAddresses: z
              .array(z.string().nullable())
              .describe("The contact's instant messaging (IM) addresses.")
              .optional(),
            initials: z.string().describe("The contact's initials.").nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/dataSecurityAndGovernance/sensitivityLabels',
    alias: 'list-sensitivity-labels',
    description: `Get sensitivityLabels from me`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/dataSecurityAndGovernance/sensitivityLabels/:sensitivityLabelId',
    alias: 'get-sensitivity-label',
    description: `Get sensitivityLabels from me`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/directReports',
    alias: 'list-my-direct-reports',
    description: `Get a user's direct reports. Returns the users and contacts for whom this user is assigned as manager. This API doesn't support getting the direct report chain beyond the specified user's direct reports.`,
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
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/events',
    alias: 'list-calendar-events',
    description: `Get a list of event objects in the user's mailbox. The list contains single
instance meetings and series masters. To get expanded event instances, you can get the calendar view, or
get the instances of an event. Currently, this operation returns event bodies in only HTML format. There are two scenarios where an app can get events in another user's calendar:`,
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
    response: z.void()
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
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            type: microsoft_graph_eventType.optional(),
            body: microsoft_graph_itemBody.optional(),
            subject: z.string().describe("The text of the event's subject line.").nullish(),
            attachments: z
              .array(microsoft_graph_attachment)
              .describe(
                'The collection of FileAttachment, ItemAttachment, and referenceAttachment attachments for the event. Navigation property. Read-only. Nullable.'
              )
              .optional(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            start: microsoft_graph_dateTimeTimeZone.optional(),
            end: microsoft_graph_dateTimeTimeZone.optional(),
            location: microsoft_graph_location.optional(),
            showAs: microsoft_graph_freeBusyStatus.optional(),
            sensitivity: microsoft_graph_sensitivity.optional(),
            isAllDay: z
              .boolean()
              .describe(
                "Set to true if the event lasts all day. If true, regardless of whether it's a single-day or multi-day event, start, and endtime must be set to midnight and be in the same time zone."
              )
              .nullish(),
            importance: microsoft_graph_importance.optional(),
            isOnlineMeeting: z
              .boolean()
              .describe(
                'True if this event has online meeting information (that is, onlineMeeting points to an onlineMeetingInfo resource), false otherwise. Default is false (onlineMeeting is null). Optional.  After you set isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting. Subsequently, Outlook ignores any further changes to isOnlineMeeting, and the meeting remains available online.'
              )
              .nullish(),
            isReminderOn: z
              .boolean()
              .describe('Set to true if an alert is set to remind the user of the event.')
              .nullish(),
            attendees: z
              .array(microsoft_graph_attendee)
              .describe('The collection of attendees for the event.')
              .optional(),
            recurrence: microsoft_graph_patternedRecurrence.optional(),
            reminderMinutesBeforeStart: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'The number of minutes before the event start time that the reminder alert occurs.'
              )
              .nullish(),
            allowNewTimeProposals: z
              .boolean()
              .describe(
                'true if the meeting organizer allows invitees to propose a new time when responding; otherwise, false. Optional. The default is true.'
              )
              .nullish(),
            responseRequested: z
              .boolean()
              .describe(
                'Default is true, which represents the organizer would like an invitee to send a response to the event.'
              )
              .nullish(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/events/:eventId',
    alias: 'get-calendar-event',
    description: `Get the properties and relationships of the specified event object. Currently, this operation returns event bodies in only HTML format. There are two scenarios where an app can get an event in another user's calendar: Since the event resource supports extensions, you can also use the GET operation to get custom properties and extension data in an event instance.`,
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
    response: z.void()
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
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            type: microsoft_graph_eventType.optional(),
            body: microsoft_graph_itemBody.optional(),
            subject: z.string().describe("The text of the event's subject line.").nullish(),
            attachments: z
              .array(microsoft_graph_attachment)
              .describe(
                'The collection of FileAttachment, ItemAttachment, and referenceAttachment attachments for the event. Navigation property. Read-only. Nullable.'
              )
              .optional(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the event. Read-only. Nullable.'
              )
              .optional(),
            start: microsoft_graph_dateTimeTimeZone.optional(),
            end: microsoft_graph_dateTimeTimeZone.optional(),
            location: microsoft_graph_location.optional(),
            showAs: microsoft_graph_freeBusyStatus.optional(),
            sensitivity: microsoft_graph_sensitivity.optional(),
            isAllDay: z
              .boolean()
              .describe(
                "Set to true if the event lasts all day. If true, regardless of whether it's a single-day or multi-day event, start, and endtime must be set to midnight and be in the same time zone."
              )
              .nullish(),
            importance: microsoft_graph_importance.optional(),
            isOnlineMeeting: z
              .boolean()
              .describe(
                'True if this event has online meeting information (that is, onlineMeeting points to an onlineMeetingInfo resource), false otherwise. Default is false (onlineMeeting is null). Optional.  After you set isOnlineMeeting to true, Microsoft Graph initializes onlineMeeting. Subsequently, Outlook ignores any further changes to isOnlineMeeting, and the meeting remains available online.'
              )
              .nullish(),
            isReminderOn: z
              .boolean()
              .describe('Set to true if an alert is set to remind the user of the event.')
              .nullish(),
            attendees: z
              .array(microsoft_graph_attendee)
              .describe('The collection of attendees for the event.')
              .optional(),
            recurrence: microsoft_graph_patternedRecurrence.optional(),
            reminderMinutesBeforeStart: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'The number of minutes before the event start time that the reminder alert occurs.'
              )
              .nullish(),
            allowNewTimeProposals: z
              .boolean()
              .describe(
                'true if the meeting organizer allows invitees to propose a new time when responding; otherwise, false. Optional. The default is true.'
              )
              .nullish(),
            responseRequested: z
              .boolean()
              .describe(
                'Default is true, which represents the organizer would like an invitee to send a response to the event.'
              )
              .nullish(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/events/:eventId',
    alias: 'delete-calendar-event',
    description: `Removes the specified event from the containing calendar.  If the event is a meeting, deleting the event on the organizer's calendar sends a cancellation message to the meeting attendees.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/events/:eventId/accept',
    alias: 'accept-calendar-event',
    description: `Accept the specified event in a user calendar.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: accept_calendar_event_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/events/:eventId/cancel',
    alias: 'cancel-calendar-event',
    description: `This action allows the organizer of a meeting to send a cancellation message and cancel the event.  The action moves the event to the Deleted Items folder. The organizer can also cancel an occurrence of a recurring meeting 
by providing the occurrence event ID. An attendee calling this action gets an error (HTTP 400 Bad Request), with the following
error message: 'Your request can't be completed. You need to be an organizer to cancel a meeting.' This action differs from Delete in that Cancel is available to only the organizer, and lets
the organizer send a custom message to the attendees about the cancellation.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ Comment: z.string().nullable() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/events/:eventId/decline',
    alias: 'decline-calendar-event',
    description: `Decline invitation to the specified event in a user calendar. If the event allows proposals for new times, on declining the event, an invitee can choose to suggest an alternative time by including the proposedNewTime parameter. For more information on how to propose a time, and how to receive and accept a new time proposal, see Propose new meeting times.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: decline_calendar_event_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/events/:eventId/dismissReminder',
    alias: 'dismiss-calendar-event-reminder',
    description: `Dismiss a reminder that has been triggered for an event in a user calendar.`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/events/:eventId/forward',
    alias: 'forward-calendar-event',
    description: `This action allows the organizer or attendee of a meeting event to forward the
meeting request to a new recipient. If the meeting event is forwarded from an attendee's Microsoft 365 mailbox to another recipient, this action
also sends a message to notify the organizer of the forwarding, and adds the recipient to the organizer's
copy of the meeting event. This convenience is not available when forwarding from an Outlook.com account.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: forward_calendar_event_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/events/:eventId/snoozeReminder',
    alias: 'snooze-calendar-event-reminder',
    description: `Postpone a reminder for an event in a user calendar until a new time.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: snooze_calendar_event_reminder_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/events/:eventId/tentativelyAccept',
    alias: 'tentatively-accept-calendar-event',
    description: `Tentatively accept the specified event in a user calendar. If the event allows proposals for new times, on responding tentative to the event, an invitee can choose to suggest an alternative time by including the proposedNewTime parameter. For more information on how to propose a time, and how to receive and accept a new time proposal, see Propose new meeting times.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: decline_calendar_event_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/events/delta()',
    alias: 'list-calendar-events-delta',
    description: `Get a set of event resources that have been added, deleted, or updated in a calendarView (a range of events defined by start and end dates) of the user's primary calendar. Typically, synchronizing events in a calendarView in a local store entails a round of multiple delta function calls. The initial call is a full synchronization, and every subsequent delta call in the same round gets the incremental changes (additions, deletions, or updates). This allows you to maintain and synchronize a local store of events in the specified calendarView, without having to fetch all the events of that calendar from the server every time.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'startDateTime',
        type: 'Query',
        schema: z
          .string()
          .describe(
            'The start date and time of the time range in the function, represented in ISO 8601 format. For example, 2019-11-08T20:00:00-08:00'
          ),
      },
      {
        name: 'endDateTime',
        type: 'Query',
        schema: z
          .string()
          .describe(
            'The end date and time of the time range in the function, represented in ISO 8601 format. For example, 2019-11-08T20:00:00-08:00'
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
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/findMeetingTimes',
    alias: 'find-meeting-times',
    description: `Suggest meeting times and locations based on organizer and attendee availability, and time or location constraints specified as parameters. If findMeetingTimes cannot return any meeting suggestions, the response would indicate a reason in the emptySuggestionsReason property.
Based on this value, you can better adjust the parameters and call findMeetingTimes again. The algorithm used to suggest meeting times and locations undergoes fine-tuning from time to time. In scenarios like test environments where the input parameters and calendar data remain static, expect that the suggested results may differ over time.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: find_meeting_times_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/getMailTips',
    alias: 'get-mail-tips',
    description: `Get the MailTips of one or more recipients as available to the signed-in user. Note that by making a POST call to the getMailTips action, you can request specific types of MailTips to
be returned for more than one recipient at one time. The requested MailTips are returned in a mailTips collection.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: get_mail_tips_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/inferenceClassification/overrides',
    alias: 'list-focused-inbox-overrides',
    description: `Get the overrides that a user has set up to always classify messages from certain senders in specific ways. Each override corresponds to an SMTP address of a sender. Initially, a user does not have any overrides.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/inferenceClassification/overrides',
    alias: 'create-focused-inbox-override',
    description: `Create an override for a sender identified by an SMTP address. Future messages from that SMTP address will be consistently classified
as specified in the override. Note`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_inferenceClassificationOverride,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/inferenceClassification/overrides/:inferenceClassificationOverrideId',
    alias: 'update-focused-inbox-override',
    description: `Change the classifyAs field of an override as specified. You cannot use PATCH to change any other fields in an inferenceClassificationOverride instance. If an override exists for a sender and the sender changes his/her display name, you can use POST to force an update to the name field in the existing override. If an override exists for a sender and the sender changes his/her SMTP address, deleting the existing override and creating a new one with
the new SMTP address is the only way to 'update' the override for this sender.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_inferenceClassificationOverride,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/inferenceClassification/overrides/:inferenceClassificationOverrideId',
    alias: 'delete-focused-inbox-override',
    description: `Delete an override specified by its ID.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/insights/trending',
    alias: 'list-trending-insights',
    description: `Calculated insight that includes a list of documents trending around the user.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/joinedTeams',
    alias: 'list-joined-teams',
    description: `Get the teams in Microsoft Teams that the user is a direct member of.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/mailboxSettings',
    alias: 'get-mailbox-settings',
    description: `Get the user's mailboxSettings. You can view all mailbox settings, or get specific settings. Users can set the following settings for their mailboxes through an Outlook client: Users can set their preferred date and time formats using Outlook on the web. Users can choose one of the supported short date or short time formats. This GET operation returns the format the user has chosen. Users can set the time zone they prefer on any Outlook client, by choosing from the supported time zones that their administrator has set up for their mailbox server. The administrator can set up time zones in the Windows time zone format or  Internet Assigned Numbers Authority (IANA) time zone (also known as Olson time zone) format. The Windows format is the default. This GET operation returns the user's preferred time zone in the format that the administrator has set up. If you want that time zone to be in a specific format (Windows or IANA), you can first update the preferred time zone in that format as a mailbox setting. Subsequently you will be able to get the time zone in that format. Alternatively, you can manage the format conversion separately in your app.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/mailboxSettings',
    alias: 'update-mailbox-settings',
    description: `Enable, configure, or disable one or more of the following settings as part of a user's mailboxSettings: When updating the preferred date or time format for a user, specify it in respectively, the short date or short time format. When updating the preferred time zone for a user, specify it in the Windows or Internet Assigned Numbers Authority (IANA) time zone (also known as Olson time zone) format. You can also further customize the time zone as shown in example 2 below.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New property values`,
        type: 'Body',
        schema: microsoft_graph_mailboxSettings,
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/mailFolders',
    alias: 'create-mail-folder',
    description: `Use this API to create a new mail folder in the root folder of the user's mailbox. If you intend a new folder to be hidden, you must set the isHidden property to true on creation.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_mailFolder,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/mailFolders/:mailFolderId',
    alias: 'update-mail-folder',
    description: `Update the properties of mailfolder object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_mailFolder,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/mailFolders/:mailFolderId',
    alias: 'delete-mail-folder',
    description: `Delete the specified mailFolder. The folder can be a mailSearchFolder. You can specify a mail folder by its folder ID, or by its well-known folder name, if one exists.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/mailFolders/:mailFolderId/childFolders',
    alias: 'list-mail-child-folders',
    description: `Get the folder collection under the specified folder. You can use the .../me/mailFolders shortcut to get the top-level
folder collection and navigate to another folder. By default, this operation does not return hidden folders. Use a query parameter includeHiddenFolders to include them in the response.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/mailFolders/:mailFolderId/childFolders',
    alias: 'create-mail-child-folder',
    description: `Use this API to create a new child mailFolder. If you intend a new folder to be hidden, you must set the isHidden property to true on creation.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_mailFolder,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/mailFolders/:mailFolderId/messageRules',
    alias: 'list-mail-rules',
    description: `Get all the messageRule objects defined for the user's inbox.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/mailFolders/:mailFolderId/messageRules',
    alias: 'create-mail-rule',
    description: `Create a messageRule object by specifying a set of conditions and actions. Outlook carries out those actions if an incoming message in the user's Inbox meets the specified conditions.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_messageRule,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/mailFolders/:mailFolderId/messageRules/:messageRuleId',
    alias: 'update-mail-rule',
    description: `Change writable properties on a messageRule object and save the changes.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_messageRule,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/mailFolders/:mailFolderId/messageRules/:messageRuleId',
    alias: 'delete-mail-rule',
    description: `Delete the specified messageRule object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/mailFolders/:mailFolderId/messages',
    alias: 'list-mail-folder-messages',
    description: `Get all the messages in the specified user's mailbox, or those messages in a specified folder in the mailbox.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/mailFolders/:mailFolderId/messages/delta()',
    alias: 'list-mail-folder-messages-delta',
    description: `Get a set of messages added, deleted, or updated in a specified folder. A delta function call for messages in a folder is similar to a GET request, except that by appropriately
applying state tokens in one or more of these calls, you can [query for incremental changes in the messages in
that folder](/graph/delta-query-messages). It allows you to maintain and synchronize a local store of a user's messages without
having to fetch the entire set of messages from the server every time.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'changeType',
        type: 'Query',
        schema: z
          .string()
          .describe(
            'A custom query option to filter the delta response based on the type of change. Supported values are created, updated or deleted.'
          )
          .optional(),
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
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/manager',
    alias: 'get-my-manager',
    description: `The user or contact that is this user's manager. Read-only. Supports $expand.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/memberOf',
    alias: 'list-my-memberships',
    description: `The groups and directory roles that the user is a member of. Read-only. Nullable. Supports $expand.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/messages',
    alias: 'list-mail-messages',
    description: `Get an open extension (openTypeExtension object) identified by name or fully qualified name. The table in the Permissions section lists the resources that support open extensions. The following table lists the three scenarios where you can get an open extension from a supported resource instance.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages',
    alias: 'create-draft-email',
    description: `Create an open extension (openTypeExtension object) and add custom properties in a new or existing instance of a resource. You can create an open extension in a resource instance and store custom data to it all in the same operation, except for specific resources. The table in the Permissions section lists the resources that support open extensions.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            body: microsoft_graph_itemBody.optional(),
            subject: z.string().describe('The subject of the message.').nullish(),
            attachments: z
              .array(microsoft_graph_attachment)
              .describe('The fileAttachment and itemAttachment attachments for the message.')
              .optional(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the message. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the message. Nullable.'
              )
              .optional(),
            importance: microsoft_graph_importance.optional(),
            from: microsoft_graph_recipient.optional(),
            toRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The To: recipients for the message.')
              .optional(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
            bccRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The Bcc: recipients for the message.')
              .optional(),
            bodyPreview: z
              .string()
              .describe('The first 255 characters of the message body. It is in text format.')
              .nullish(),
            ccRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The Cc: recipients for the message.')
              .optional(),
            conversationId: z
              .string()
              .describe('The ID of the conversation the email belongs to.')
              .nullish(),
            conversationIndex: z
              .string()
              .describe('Indicates the position of the message within the conversation.')
              .nullish(),
            flag: microsoft_graph_followupFlag.optional(),
            hasAttachments: z
              .boolean()
              .describe(
                "Indicates whether the message has attachments. This property doesn't include inline attachments, so if a message contains only inline attachments, this property is false. To verify the existence of inline attachments, parse the body property to look for a src attribute, such as <IMG src='cid:image001.jpg@01D26CD8.6C05F070'>."
              )
              .nullish(),
            inferenceClassification: microsoft_graph_inferenceClassificationType.optional(),
            internetMessageHeaders: z
              .array(microsoft_graph_internetMessageHeader)
              .describe(
                'A collection of message headers defined by RFC5322. The set includes message headers indicating the network path taken by a message from the sender to the recipient. It can also contain custom message headers that hold app data for the message.  Requires $select to retrieve. Read-only.'
              )
              .optional(),
            internetMessageId: z
              .string()
              .describe('The message ID in the format specified by RFC2822.')
              .nullish(),
            isDeliveryReceiptRequested: z
              .boolean()
              .describe('Indicates whether a read receipt is requested for the message.')
              .nullish(),
            isDraft: z
              .boolean()
              .describe(
                "Indicates whether the message is a draft. A message is a draft if it hasn't been sent yet."
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/messages/:messageId',
    alias: 'get-mail-message',
    description: `Get the properties and relationships of the eventMessage object. Apply the $expand parameter on the event navigation property to get the associated event in an attendee's calendar. Currently, this operation returns event message bodies in only HTML format.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/messages/:messageId',
    alias: 'update-mail-message',
    description: `Update the properties of an eventMessage object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            body: microsoft_graph_itemBody.optional(),
            subject: z.string().describe('The subject of the message.').nullish(),
            attachments: z
              .array(microsoft_graph_attachment)
              .describe('The fileAttachment and itemAttachment attachments for the message.')
              .optional(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the message. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the message. Nullable.'
              )
              .optional(),
            importance: microsoft_graph_importance.optional(),
            from: microsoft_graph_recipient.optional(),
            toRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The To: recipients for the message.')
              .optional(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
            bccRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The Bcc: recipients for the message.')
              .optional(),
            bodyPreview: z
              .string()
              .describe('The first 255 characters of the message body. It is in text format.')
              .nullish(),
            ccRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The Cc: recipients for the message.')
              .optional(),
            conversationId: z
              .string()
              .describe('The ID of the conversation the email belongs to.')
              .nullish(),
            conversationIndex: z
              .string()
              .describe('Indicates the position of the message within the conversation.')
              .nullish(),
            flag: microsoft_graph_followupFlag.optional(),
            hasAttachments: z
              .boolean()
              .describe(
                "Indicates whether the message has attachments. This property doesn't include inline attachments, so if a message contains only inline attachments, this property is false. To verify the existence of inline attachments, parse the body property to look for a src attribute, such as <IMG src='cid:image001.jpg@01D26CD8.6C05F070'>."
              )
              .nullish(),
            inferenceClassification: microsoft_graph_inferenceClassificationType.optional(),
            internetMessageHeaders: z
              .array(microsoft_graph_internetMessageHeader)
              .describe(
                'A collection of message headers defined by RFC5322. The set includes message headers indicating the network path taken by a message from the sender to the recipient. It can also contain custom message headers that hold app data for the message.  Requires $select to retrieve. Read-only.'
              )
              .optional(),
            internetMessageId: z
              .string()
              .describe('The message ID in the format specified by RFC2822.')
              .nullish(),
            isDeliveryReceiptRequested: z
              .boolean()
              .describe('Indicates whether a read receipt is requested for the message.')
              .nullish(),
            isDraft: z
              .boolean()
              .describe(
                "Indicates whether the message is a draft. A message is a draft if it hasn't been sent yet."
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/messages/:messageId',
    alias: 'delete-mail-message',
    description: `Delete eventMessage.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/messages/:messageId/$value',
    alias: 'get-mail-message-mime',
    description: `Get an open extension (openTypeExtension object) identified by name or fully qualified name. The table in the Permissions section lists the resources that support open extensions. The following table lists the three scenarios where you can get an open extension from a supported resource instance.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'includeHiddenMessages',
        type: 'Query',
        schema: z.string().describe('Include Hidden Messages').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/messages/:messageId/attachments',
    alias: 'list-mail-attachments',
    description: `Retrieve a list of attachment objects.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/attachments',
    alias: 'add-mail-attachment',
    description: `Use this API to create a new Attachment. An attachment can be one of the following types: All these types of attachment resources are derived from the attachment
resource.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_attachment,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/messages/:messageId/attachments/:attachmentId',
    alias: 'delete-mail-attachment',
    description: `Delete navigation property attachments for me`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/attachments/createUploadSession',
    alias: 'create-mail-attachment-upload-session',
    description: `Create an upload session that allows an app to iteratively upload ranges of a file, so as to attach the file to the specified Outlook item. The item can be a message or event. Use this approach to attach a file if the file size is between 3 MB and 150 MB. To attach a file that's smaller than 3 MB, do a POST operation on the attachments navigation property of the Outlook item; see how to do this for a message or for an event. As part of the response, this action returns an upload URL that you can use in subsequent sequential PUT queries. Request headers for each PUT operation let you specify the exact range of bytes to be uploaded. This allows transfer to be resumed, in case the network connection is dropped during upload. The following are the steps to attach a file to an Outlook item using an upload session: See attach large files to Outlook messages or events for an example.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z
          .object({ AttachmentItem: z.object({}).partial().passthrough() })
          .partial()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/copy',
    alias: 'copy-mail-message',
    description: `Copy a message to a folder within the user's mailbox.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ DestinationId: z.string() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/createForward',
    alias: 'create-forward-draft',
    description: `Invoke action createForward`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_forward_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/createReply',
    alias: 'create-reply-draft',
    description: `Create a draft to reply to the sender of a message in either JSON or MIME format. When using JSON format:
- Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
- If replyTo is specified in the original message, per Internet Message Format (RFC 2822), you should send the reply to the recipients in replyTo, and not the recipients in from.
- You can update the draft later to add reply content to the body or change other message properties. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. Send the draft message in a subsequent operation. Alternatively, reply to a message in a single operation.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_reply_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/createReplyAll',
    alias: 'create-reply-all-draft',
    description: `Create a draft to reply to the sender and all recipients of a message in either JSON or MIME format. When using JSON format:
- Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
- If the original message specifies a recipient in the replyTo property, per Internet Message Format (RFC 2822), you should send the reply to the recipients in the replyTo and toRecipients properties, and not the recipients in the from and toRecipients properties.
- You can update the draft later to add reply content to the body or change other message properties. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. Send the draft message in a subsequent operation. Alternatively, reply-all to a message in a single action.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_reply_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/forward',
    alias: 'forward-mail-message',
    description: `Forward a message using either JSON or MIME format. When using JSON format, you can:
- Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
- Specify either the toRecipients parameter or the toRecipients property of the message parameter. Specifying both or specifying neither will return an HTTP 400 Bad Request error. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. This method saves the message in the Sent Items folder. Alternatively, create a draft to forward a message, and send it later.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_forward_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/move',
    alias: 'move-mail-message',
    description: `Move a message to another folder within the specified user's mailbox. This creates a new copy of the message in the destination folder and removes the original message.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ DestinationId: z.string() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/reply',
    alias: 'reply-mail-message',
    description: `Reply to the sender of a message using either JSON or MIME format. When using JSON format:
* Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
* If the original message specifies a recipient in the replyTo property, per Internet Message Format (RFC 2822), send the reply to the recipients in replyTo and not the recipient in the from property. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. This method saves the message in the Sent Items folder. Alternatively, create a draft to reply to an existing message and send it later.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_reply_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/replyAll',
    alias: 'reply-all-mail-message',
    description: `Reply to all recipients of a message using either JSON or MIME format. When using JSON format:
- Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
- If the original message specifies a recipient in the replyTo property, per Internet Message Format (RFC 2822), send the reply to the recipients in replyTo and not the recipient in the from property. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. This method saves the message in the Sent Items folder. Alternatively, create a draft to reply-all to a message and send it later.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_reply_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/messages/:messageId/send',
    alias: 'send-draft-message',
    description: `Send an existing draft message. The draft message can be a new message draft, reply draft, reply-all draft, or a forward draft. This method saves the message in the Sent Items folder. Alternatively, send a new message in a single operation.`,
    requestFormat: 'json',
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/onenote/notebooks',
    alias: 'create-onenote-notebook',
    description: `Create a new OneNote notebook.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_notebook,
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/onenote/notebooks/:notebookId/sections',
    alias: 'create-onenote-section',
    description: `Create a new onenoteSection in the specified notebook.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_onenoteSection,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/onenote/notebooks/getNotebookFromWebUrl',
    alias: 'get-onenote-notebook-from-web-url',
    description: `Retrieve the properties and relationships of a notebook object by using its URL path. The location can be user notebooks on Microsoft 365, group notebooks, or SharePoint site-hosted team notebooks on Microsoft 365.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ webUrl: z.string().nullable() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onenote/pages',
    alias: 'list-onenote-pages',
    description: `Retrieve a list of page objects.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/onenote/pages',
    alias: 'create-onenote-page',
    description: `Create a new OneNote page in the default section of the default notebook. To create a page in a different section in the default notebook, you can use the sectionName query parameter.  Example: ../onenote/pages?sectionName=My%20section The POST /onenote/pages operation is used only to create pages in the current user's default notebook. If you're targeting other notebooks, you can create pages in a specified section.  `,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_onenotePage,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/onenote/pages/:onenotePageId',
    alias: 'delete-onenote-page',
    description: `Delete a OneNote page.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onenote/pages/:onenotePageId/content',
    alias: 'get-onenote-page-content',
    description: `The page's HTML content.`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onenote/sectionGroups',
    alias: 'list-onenote-section-groups',
    description: `Retrieve a list of sectionGroup objects.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onenote/sections',
    alias: 'list-all-onenote-sections',
    description: `Retrieve a list of onenoteSection objects.`,
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
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/onenote/sections/:onenoteSectionId/pages',
    alias: 'create-onenote-section-page',
    description: `Create a new page in the specified section.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_onenotePage,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings',
    alias: 'list-online-meetings',
    description: `Retrieve the properties and relationships of an onlineMeeting object. For example, you can: Teams live event attendee report (deprecated) and Teams live event recordings (deprecated) are online meeting artifacts. For more information, see Online meeting artifacts and permissions.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/onlineMeetings',
    alias: 'create-online-meeting',
    description: `Create an online meeting on behalf of a user.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            subject: z.string().describe('The subject of the online meeting.').nullish(),
            allowAttendeeToEnableCamera: z
              .boolean()
              .describe('Indicates whether attendees can turn on their camera.')
              .nullish(),
            allowAttendeeToEnableMic: z
              .boolean()
              .describe('Indicates whether attendees can turn on their microphone.')
              .nullish(),
            allowBreakoutRooms: z
              .boolean()
              .describe('Indicates whether breakout rooms are enabled for the meeting.')
              .nullish(),
            allowCopyingAndSharingMeetingContent: z
              .boolean()
              .describe(
                'Indicates whether the ability to copy and share meeting content is enabled for the meeting.'
              )
              .nullish(),
            allowedLobbyAdmitters: microsoft_graph_allowedLobbyAdmitterRoles.optional(),
            allowedPresenters: microsoft_graph_onlineMeetingPresenters.optional(),
            allowLiveShare: microsoft_graph_meetingLiveShareOptions.optional(),
            allowMeetingChat: microsoft_graph_meetingChatMode.optional(),
            allowParticipantsToChangeName: z
              .boolean()
              .describe(
                'Specifies if participants are allowed to rename themselves in an instance of the meeting.'
              )
              .nullish(),
            allowPowerPointSharing: z
              .boolean()
              .describe('Indicates whether PowerPoint live is enabled for the meeting.')
              .nullish(),
            allowRecording: z
              .boolean()
              .describe('Indicates whether recording is enabled for the meeting.')
              .nullish(),
            allowTeamworkReactions: z
              .boolean()
              .describe('Indicates if Teams reactions are enabled for the meeting.')
              .nullish(),
            allowTranscription: z
              .boolean()
              .describe('Indicates whether transcription is enabled for the meeting.')
              .nullish(),
            allowWhiteboard: z
              .boolean()
              .describe('Indicates whether whiteboard is enabled for the meeting.')
              .nullish(),
            audioConferencing: microsoft_graph_audioConferencing.optional(),
            chatInfo: microsoft_graph_chatInfo.optional(),
            chatRestrictions: microsoft_graph_chatRestrictions.optional(),
            expiryDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Indicates the date and time when the meeting resource expires. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
              )
              .nullish(),
            isEndToEndEncryptionEnabled: z
              .boolean()
              .describe(
                'Indicates whether end-to-end encryption (E2EE) is enabled for the online meeting.'
              )
              .nullish(),
            isEntryExitAnnounced: z
              .boolean()
              .describe('Indicates whether to announce when callers join or leave.')
              .nullish(),
            joinInformation: microsoft_graph_itemBody.optional(),
            joinMeetingIdSettings: microsoft_graph_joinMeetingIdSettings.optional(),
            joinWebUrl: z
              .string()
              .describe('The join URL of the online meeting. Read-only.')
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId',
    alias: 'get-online-meeting',
    description: `Retrieve the properties and relationships of an onlineMeeting object. For example, you can: Teams live event attendee report (deprecated) and Teams live event recordings (deprecated) are online meeting artifacts. For more information, see Online meeting artifacts and permissions.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/onlineMeetings/:onlineMeetingId',
    alias: 'update-online-meeting',
    description: `Update the properties of the specified onlineMeeting object. For the list of properties that support updating, see the Request body section.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            subject: z.string().describe('The subject of the online meeting.').nullish(),
            allowAttendeeToEnableCamera: z
              .boolean()
              .describe('Indicates whether attendees can turn on their camera.')
              .nullish(),
            allowAttendeeToEnableMic: z
              .boolean()
              .describe('Indicates whether attendees can turn on their microphone.')
              .nullish(),
            allowBreakoutRooms: z
              .boolean()
              .describe('Indicates whether breakout rooms are enabled for the meeting.')
              .nullish(),
            allowCopyingAndSharingMeetingContent: z
              .boolean()
              .describe(
                'Indicates whether the ability to copy and share meeting content is enabled for the meeting.'
              )
              .nullish(),
            allowedLobbyAdmitters: microsoft_graph_allowedLobbyAdmitterRoles.optional(),
            allowedPresenters: microsoft_graph_onlineMeetingPresenters.optional(),
            allowLiveShare: microsoft_graph_meetingLiveShareOptions.optional(),
            allowMeetingChat: microsoft_graph_meetingChatMode.optional(),
            allowParticipantsToChangeName: z
              .boolean()
              .describe(
                'Specifies if participants are allowed to rename themselves in an instance of the meeting.'
              )
              .nullish(),
            allowPowerPointSharing: z
              .boolean()
              .describe('Indicates whether PowerPoint live is enabled for the meeting.')
              .nullish(),
            allowRecording: z
              .boolean()
              .describe('Indicates whether recording is enabled for the meeting.')
              .nullish(),
            allowTeamworkReactions: z
              .boolean()
              .describe('Indicates if Teams reactions are enabled for the meeting.')
              .nullish(),
            allowTranscription: z
              .boolean()
              .describe('Indicates whether transcription is enabled for the meeting.')
              .nullish(),
            allowWhiteboard: z
              .boolean()
              .describe('Indicates whether whiteboard is enabled for the meeting.')
              .nullish(),
            audioConferencing: microsoft_graph_audioConferencing.optional(),
            chatInfo: microsoft_graph_chatInfo.optional(),
            chatRestrictions: microsoft_graph_chatRestrictions.optional(),
            expiryDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Indicates the date and time when the meeting resource expires. The timestamp type represents date and time information using ISO 8601 format and is always in UTC. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z.'
              )
              .nullish(),
            isEndToEndEncryptionEnabled: z
              .boolean()
              .describe(
                'Indicates whether end-to-end encryption (E2EE) is enabled for the online meeting.'
              )
              .nullish(),
            isEntryExitAnnounced: z
              .boolean()
              .describe('Indicates whether to announce when callers join or leave.')
              .nullish(),
            joinInformation: microsoft_graph_itemBody.optional(),
            joinMeetingIdSettings: microsoft_graph_joinMeetingIdSettings.optional(),
            joinWebUrl: z
              .string()
              .describe('The join URL of the online meeting. Read-only.')
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/onlineMeetings/:onlineMeetingId',
    alias: 'delete-online-meeting',
    description: `Delete an onlineMeeting object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/attendanceReports',
    alias: 'list-meeting-attendance-reports',
    description: `Get a list of meetingAttendanceReport objects for an onlineMeeting or a virtualEvent. Each time an online meeting or a virtual event ends, an attendance report is generated for that session.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/attendanceReports/:meetingAttendanceReportId',
    alias: 'get-meeting-attendance-report',
    description: `Get the meetingAttendanceReport for an onlineMeeting or a virtualEvent. When an online meeting ends, an attendance report is generated for that session.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/attendanceReports/:meetingAttendanceReportId/attendanceRecords',
    alias: 'list-meeting-attendance-records',
    description: `Get a list of attendanceRecord objects and their properties.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/recordings',
    alias: 'list-meeting-recordings',
    description: `Get a callRecording object associated with a scheduled online meeting and an ad hoc call. This API supports the retrieval of call recordings from all meeting types except live events. For a recording, this API returns the metadata of the single recording associated with the online meeting or an ad hoc call. For the content of a recording, this API returns the stream of bytes associated with the recording.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/recordings/:callRecordingId',
    alias: 'get-meeting-recording',
    description: `The recordings of an online meeting. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/recordings/:callRecordingId/content',
    alias: 'get-meeting-recording-content',
    description: `The content of the recording. Read-only.`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/transcripts',
    alias: 'list-meeting-transcripts',
    description: `The transcripts of an online meeting. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/transcripts/:callTranscriptId',
    alias: 'get-meeting-transcript',
    description: `The transcripts of an online meeting. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/onlineMeetings/:onlineMeetingId/transcripts/:callTranscriptId/content',
    alias: 'get-meeting-transcript-content',
    description: `The content of the transcript. Read-only.`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/outlook/masterCategories',
    alias: 'list-outlook-categories',
    description: `Get all the categories that have been defined for a user.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/outlook/masterCategories',
    alias: 'create-outlook-category',
    description: `Create an outlookCategory object in the user's master list of categories.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_outlookCategory,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/outlook/supportedLanguages()',
    alias: 'list-supported-languages',
    description: `Get the list of locales and languages that are supported for the user, as configured on the user's mailbox server. When setting up an Outlook client, the user selects the preferred language from this supported list. You can subsequently get the preferred language by
getting the user's mailbox settings.`,
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
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: `/me/outlook/supportedTimeZones(TimeZoneStandard=':TimeZoneStandard')`,
    alias: 'list-supported-time-zones',
    description: `Get the list of time zones that are supported for the user, as configured on the user's mailbox server. You can explicitly specify to have time zones returned in the Windows time zone format or  Internet Assigned Numbers Authority (IANA) time zone (also known as Olson time zone) format. The Windows format is the default. When setting up an Outlook client, the user selects the preferred time zone from this supported list. You can subsequently get the preferred time zone by
getting the user's mailbox settings.`,
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
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/people',
    alias: 'list-relevant-people',
    description: `Retrieve a collection of person objects ordered by their relevance to the user, which is determined by the user's communication and collaboration patterns, and business relationships. You can get this information via the People API. For examples, see the Examples section and the article Use the People API to get information about the people most relevant to you.`,
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
    response: z.void()
  },
  {
    method: 'put',
    path: '/me/photo/$value',
    alias: 'upload-my-profile-photo',
    description: `Update the photo for the specified contact, group, team, or user in a tenant. The size of the photo you can update to is limited to 4 MB. You can use either PATCH or PUT for this operation.`,
    requestFormat: 'binary',
    parameters: [
      {
        name: 'body',
        description: `New media content.`,
        type: 'Body',
        schema: z.string().describe('Base64-encoded file content. The server decodes it and PUTs the raw bytes to Microsoft Graph.'),
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/presence',
    alias: 'get-my-presence',
    description: `Get a user's presence information.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/presence/clearPresence',
    alias: 'clear-my-presence',
    description: `Clear the application's presence session for a user. If it is the user's only presence session, the user's presence will change to Offline/Offline. For details about presences sessions, see presence: setPresence.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ sessionId: z.string().nullable() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/presence/clearUserPreferredPresence',
    alias: 'clear-my-user-preferred-presence',
    description: `Clear the preferred availability and activity status for a user.`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/presence/setPresence',
    alias: 'set-my-presence',
    description: `Set the state of a user's presence session as an application. For more information about presence sessions, states permutations, and timeouts, see Manage presence state using the Microsoft Graph API.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: set_my_presence_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/presence/setStatusMessage',
    alias: 'set-my-status-message',
    description: `Set a presence status message for a user. An optional expiration date and time can be supplied.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: set_my_status_message_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/presence/setUserPreferredPresence',
    alias: 'set-my-user-preferred-presence',
    description: `Set the preferred availability and activity status for a user. If the preferred presence of a user is set, the user's presence shows as the preferred status. Preferred presence takes effect only when at least one presence session exists for the user. Otherwise, the user's presence shows as Offline. A presence session is created as a result of a successful setPresence operation, or if the user is signed in on a Microsoft Teams client. For more details, see presence sessions and time-out and expiration.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: set_my_user_preferred_presence_Body,
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/teamwork/associatedTeams',
    alias: 'list-my-associated-teams',
    description: `Get the list of teams in Microsoft Teams that a user is associated with.
Currently, a user can be associated with a team in two different ways:`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/teamwork/installedApps',
    alias: 'list-my-installed-teams-apps',
    description: `The apps installed in the personal scope of this user.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/teamwork/sendActivityNotification',
    alias: 'send-my-activity-notification',
    description: `Send an activity feed notification to a user. For more information, see sending Teams activity notifications.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: send_my_activity_notification_Body,
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/todo/lists',
    alias: 'create-todo-task-list',
    description: `Create a new lists object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_todoTaskList,
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/me/todo/lists/:todoTaskListId',
    alias: 'update-todo-task-list',
    description: `Update the properties of a todoTaskList object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_todoTaskList,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/todo/lists/:todoTaskListId',
    alias: 'delete-todo-task-list',
    description: `Deletes a todoTaskList object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
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
    response: z.void()
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
    response: z.void()
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
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/todo/lists/:todoTaskListId/tasks/:todoTaskId',
    alias: 'delete-todo-task',
    description: `Delete a todoTask object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/me/todo/lists/:todoTaskListId/tasks/:todoTaskId/linkedResources',
    alias: 'list-todo-linked-resources',
    description: `Get information of one or more items in a partner application, based on which a specified task was created. The information is represented in a linkedResource object for each item. It includes an external ID for the item in the partner application, and if applicable, a deep link to that item in the application.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/me/todo/lists/:todoTaskListId/tasks/:todoTaskId/linkedResources',
    alias: 'create-todo-linked-resource',
    description: `Create a linkedResource object to associate a specified task with an item in a partner application. For example, you can associate a task with an email item in Outlook that spurred the task, and you can create a linkedResource object to track its association. You can also create a linkedResource object while creating a task.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_linkedResource,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/me/todo/lists/:todoTaskListId/tasks/:todoTaskId/linkedResources/:linkedResourceId',
    alias: 'delete-todo-linked-resource',
    description: `Delete a linkedResource object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/places/:placeId',
    alias: 'update-place',
    description: `Update the properties of place object that can be a building, floor, section, desk, room, workspace, or roomList. You can identify the place by specifying the id property.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New property values`,
        type: 'Body',
        schema: microsoft_graph_place,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/places/:placeId/graph.room',
    alias: 'get-room',
    description: `Get a collection of the specified type of place objects defined in a tenant. You can do the following for a given tenant:
- List all buildings.
- List all floors.
- List all sections.
- List all desks.
- List all rooms.
- List all workspaces.
- List all room lists.
- List rooms in a specific room list.
- List workspaces in a specific room list.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/places/:placeId/graph.roomList',
    alias: 'get-room-list',
    description: `Read the properties of a place object specified by its ID. The place object can be one of the following types: The listed resources are derived from the place object.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/places/:placeId/graph.roomList/rooms',
    alias: 'list-room-list-rooms',
    description: `Get rooms from places`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/places/:placeId/graph.roomList/rooms/:roomId',
    alias: 'get-room-list-room',
    description: `Get rooms from places`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/planner/buckets',
    alias: 'create-planner-bucket',
    description: `Create a new plannerBucket object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_plannerBucket,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/planner/buckets/:plannerBucketId',
    alias: 'get-planner-bucket',
    description: `Retrieve the properties and relationships of a plannerBucket object.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/planner/buckets/:plannerBucketId',
    alias: 'update-planner-bucket',
    description: `Update the properties of plannerbucket object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_plannerBucket,
      },
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag value.'),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/planner/buckets/:plannerBucketId',
    alias: 'delete-planner-bucket',
    description: `Delete plannerBucket.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/planner/plans/:plannerPlanId/buckets',
    alias: 'list-plan-buckets',
    description: `Retrieve a list of plannerBucket objects contained by a plannerPlan object.`,
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
    response: z.void()
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
    response: z.void()
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
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Read-only. Date and time at which the task is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            title: z.string().describe('Title of the task.').optional(),
            details: microsoft_graph_plannerTaskDetails.optional(),
            activeChecklistItemCount: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'Number of checklist items with value set to false, representing incomplete items.'
              )
              .nullish(),
            appliedCategories: microsoft_graph_plannerAppliedCategories.optional(),
            assigneePriority: z
              .string()
              .describe(
                'Hint used to order items of this type in a list view. The format is defined as outlined here.'
              )
              .nullish(),
            assignments: microsoft_graph_plannerAssignments.optional(),
            bucketId: z
              .string()
              .describe(
                "Bucket ID to which the task belongs. The bucket needs to be in the plan that the task is in. It's 28 characters long and case-sensitive. Format validation is done on the service."
              )
              .nullish(),
            checklistItemCount: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe('Number of checklist items that are present on the task.')
              .nullish(),
            completedBy: microsoft_graph_identitySet.optional(),
            completedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Read-only. Date and time at which the 'percentComplete' of the task is set to '100'. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
              )
              .nullish(),
            conversationThreadId: z
              .string()
              .describe(
                'Thread ID of the conversation on the task. This is the ID of the conversation thread object created in the group.'
              )
              .nullish(),
            createdBy: microsoft_graph_identitySet.optional(),
            dueDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            hasDescription: z
              .boolean()
              .describe(
                'Read-only. Value is true if the details object of the task has a nonempty description and false otherwise.'
              )
              .nullish(),
            orderHint: z
              .string()
              .describe(
                'Hint used to order items of this type in a list view. The format is defined as outlined here.'
              )
              .nullish(),
            percentComplete: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'Percentage of task completion. When set to 100, the task is considered completed.'
              )
              .nullish(),
            planId: z.string().describe('Plan ID to which the task belongs.').nullish(),
            previewType: microsoft_graph_plannerPreviewType.optional(),
            priority: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                "Priority of the task. The valid range of values is between 0 and 10, with the increasing value being lower priority (0 has the highest priority and 10 has the lowest priority).  Currently, Planner interprets values 0 and 1 as 'urgent', 2, 3 and 4 as 'important', 5, 6, and 7 as 'medium', and 8, 9, and 10 as 'low'.  Additionally, Planner sets the value 1 for 'urgent', 3 for 'important', 5 for 'medium', and 9 for 'low'."
              )
              .nullish(),
            referenceCount: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe('Number of external references that exist on the task.')
              .nullish(),
            startDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Date and time at which the task starts. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            assignedToTaskBoardFormat:
              microsoft_graph_plannerAssignedToTaskBoardTaskFormat.optional(),
            bucketTaskBoardFormat: microsoft_graph_plannerBucketTaskBoardTaskFormat.optional(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/planner/tasks/:plannerTaskId',
    alias: 'update-planner-task',
    description: `Update the properties of plannerTask object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Read-only. Date and time at which the task is created. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            title: z.string().describe('Title of the task.').optional(),
            details: microsoft_graph_plannerTaskDetails.optional(),
            activeChecklistItemCount: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'Number of checklist items with value set to false, representing incomplete items.'
              )
              .nullish(),
            appliedCategories: microsoft_graph_plannerAppliedCategories.optional(),
            assigneePriority: z
              .string()
              .describe(
                'Hint used to order items of this type in a list view. The format is defined as outlined here.'
              )
              .nullish(),
            assignments: microsoft_graph_plannerAssignments.optional(),
            bucketId: z
              .string()
              .describe(
                "Bucket ID to which the task belongs. The bucket needs to be in the plan that the task is in. It's 28 characters long and case-sensitive. Format validation is done on the service."
              )
              .nullish(),
            checklistItemCount: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe('Number of checklist items that are present on the task.')
              .nullish(),
            completedBy: microsoft_graph_identitySet.optional(),
            completedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                "Read-only. Date and time at which the 'percentComplete' of the task is set to '100'. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z"
              )
              .nullish(),
            conversationThreadId: z
              .string()
              .describe(
                'Thread ID of the conversation on the task. This is the ID of the conversation thread object created in the group.'
              )
              .nullish(),
            createdBy: microsoft_graph_identitySet.optional(),
            dueDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Date and time at which the task is due. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            hasDescription: z
              .boolean()
              .describe(
                'Read-only. Value is true if the details object of the task has a nonempty description and false otherwise.'
              )
              .nullish(),
            orderHint: z
              .string()
              .describe(
                'Hint used to order items of this type in a list view. The format is defined as outlined here.'
              )
              .nullish(),
            percentComplete: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                'Percentage of task completion. When set to 100, the task is considered completed.'
              )
              .nullish(),
            planId: z.string().describe('Plan ID to which the task belongs.').nullish(),
            previewType: microsoft_graph_plannerPreviewType.optional(),
            priority: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe(
                "Priority of the task. The valid range of values is between 0 and 10, with the increasing value being lower priority (0 has the highest priority and 10 has the lowest priority).  Currently, Planner interprets values 0 and 1 as 'urgent', 2, 3 and 4 as 'important', 5, 6, and 7 as 'medium', and 8, 9, and 10 as 'low'.  Additionally, Planner sets the value 1 for 'urgent', 3 for 'important', 5 for 'medium', and 9 for 'low'."
              )
              .nullish(),
            referenceCount: z
              .number()
              .gte(-2147483648)
              .lte(2147483647)
              .describe('Number of external references that exist on the task.')
              .nullish(),
            startDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'Date and time at which the task starts. The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            assignedToTaskBoardFormat:
              microsoft_graph_plannerAssignedToTaskBoardTaskFormat.optional(),
            bucketTaskBoardFormat: microsoft_graph_plannerBucketTaskBoardTaskFormat.optional(),
          })
          .passthrough()
          .passthrough(),
      },
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag value.'),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/planner/tasks/:plannerTaskId/details',
    alias: 'get-planner-task-details',
    description: `Retrieve the properties and relationships of a plannerTaskDetails object.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/planner/tasks/:plannerTaskId/details',
    alias: 'update-planner-task-details',
    description: `Update the properties of plannerTaskDetails object.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_plannerTaskDetails,
      },
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag value.'),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/search/query',
    alias: 'search-query',
    description: `Runs the query specified in the request body. Search results are provided in the response.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: search_query_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites',
    alias: 'search-sharepoint-sites',
    description: `List all available sites in an organization. Specific filter criteria and query options are also supported and described below: In addition, you can use a $search query against the /sites collection to find sites matching given keywords.
If you want to list all sites across all geographies, refer to getAllSites. For more guidance about building applications that use site discovery for scanning purposes, see Best practices for discovering files and detecting changes at scale.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId',
    alias: 'get-sharepoint-site',
    description: `Retrieve properties and relationships for a site resource.
A site resource represents a team site in SharePoint.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/drives',
    alias: 'list-sharepoint-site-drives',
    description: `The collection of drives (document libraries) under this site.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/drives/:driveId',
    alias: 'get-sharepoint-site-drive-by-id',
    description: `The collection of drives (document libraries) under this site.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: `/sites/:siteId/getByPath(path=':path')`,
    alias: 'get-sharepoint-site-by-path',
    description: `Invoke function getByPath`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/items',
    alias: 'list-sharepoint-site-items',
    description: `Used to address any item contained in this site. This collection can't be enumerated.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/items/:baseItemId',
    alias: 'get-sharepoint-site-item',
    description: `Used to address any item contained in this site. This collection can't be enumerated.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/lists',
    alias: 'list-sharepoint-site-lists',
    description: `Get the collection of lists for a site. Lists with the system facet are hidden by default.
To list them, include system in your $select statement.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/sites/:siteId/lists',
    alias: 'create-sharepoint-list',
    description: `Create a new list in a site.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_list,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/lists/:listId',
    alias: 'get-sharepoint-site-list',
    description: `Returns the metadata for a list.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/lists/:listId/columns',
    alias: 'list-sharepoint-list-columns',
    description: `Get the collection of columns represented as columnDefinition resources in a list.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/sites/:siteId/lists/:listId/columns',
    alias: 'create-sharepoint-list-column',
    description: `Create a column for a list with a request that specifies a columnDefinition.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            name: z
              .string()
              .describe(
                'The API-facing name of the column as it appears in the fields on a listItem. For the user-facing name, see displayName.'
              )
              .nullish(),
            displayName: z.string().describe('The user-facing name of the column.').nullish(),
            description: z
              .string()
              .describe('The user-facing description of the column.')
              .nullish(),
            type: microsoft_graph_columnTypes.optional(),
            boolean: microsoft_graph_booleanColumn.optional(),
            calculated: microsoft_graph_calculatedColumn.optional(),
            choice: microsoft_graph_choiceColumn.optional(),
            columnGroup: z
              .string()
              .describe(
                'For site columns, the name of the group this column belongs to. Helps organize related columns.'
              )
              .nullish(),
            contentApprovalStatus: microsoft_graph_contentApprovalStatusColumn.optional(),
            currency: microsoft_graph_currencyColumn.optional(),
            dateTime: microsoft_graph_dateTimeColumn.optional(),
            defaultValue: microsoft_graph_defaultColumnValue.optional(),
            enforceUniqueValues: z
              .boolean()
              .describe('If true, no two list items may have the same value for this column.')
              .nullish(),
            geolocation: microsoft_graph_geolocationColumn.optional(),
            hidden: z
              .boolean()
              .describe('Specifies whether the column is displayed in the user interface.')
              .nullish(),
            hyperlinkOrPicture: microsoft_graph_hyperlinkOrPictureColumn.optional(),
            indexed: z
              .boolean()
              .describe(
                'Specifies whether the column values can be used for sorting and searching.'
              )
              .nullish(),
            isDeletable: z
              .boolean()
              .describe('Indicates whether this column can be deleted.')
              .nullish(),
            isReorderable: z
              .boolean()
              .describe('Indicates whether values in the column can be reordered. Read-only.')
              .nullish(),
            isSealed: z
              .boolean()
              .describe('Specifies whether the column can be changed.')
              .nullish(),
            lookup: microsoft_graph_lookupColumn.optional(),
            number: microsoft_graph_numberColumn.optional(),
            personOrGroup: microsoft_graph_personOrGroupColumn.optional(),
            propagateChanges: z
              .boolean()
              .describe(
                "If 'true', changes to this column will be propagated to lists that implement the column."
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/lists/:listId/columns/:columnDefinitionId',
    alias: 'get-sharepoint-list-column',
    description: `The collection of field definitions for this list.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/sites/:siteId/lists/:listId/columns/:columnDefinitionId',
    alias: 'update-sharepoint-list-column',
    description: `Update the navigation property columns in sites`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            name: z
              .string()
              .describe(
                'The API-facing name of the column as it appears in the fields on a listItem. For the user-facing name, see displayName.'
              )
              .nullish(),
            displayName: z.string().describe('The user-facing name of the column.').nullish(),
            description: z
              .string()
              .describe('The user-facing description of the column.')
              .nullish(),
            type: microsoft_graph_columnTypes.optional(),
            boolean: microsoft_graph_booleanColumn.optional(),
            calculated: microsoft_graph_calculatedColumn.optional(),
            choice: microsoft_graph_choiceColumn.optional(),
            columnGroup: z
              .string()
              .describe(
                'For site columns, the name of the group this column belongs to. Helps organize related columns.'
              )
              .nullish(),
            contentApprovalStatus: microsoft_graph_contentApprovalStatusColumn.optional(),
            currency: microsoft_graph_currencyColumn.optional(),
            dateTime: microsoft_graph_dateTimeColumn.optional(),
            defaultValue: microsoft_graph_defaultColumnValue.optional(),
            enforceUniqueValues: z
              .boolean()
              .describe('If true, no two list items may have the same value for this column.')
              .nullish(),
            geolocation: microsoft_graph_geolocationColumn.optional(),
            hidden: z
              .boolean()
              .describe('Specifies whether the column is displayed in the user interface.')
              .nullish(),
            hyperlinkOrPicture: microsoft_graph_hyperlinkOrPictureColumn.optional(),
            indexed: z
              .boolean()
              .describe(
                'Specifies whether the column values can be used for sorting and searching.'
              )
              .nullish(),
            isDeletable: z
              .boolean()
              .describe('Indicates whether this column can be deleted.')
              .nullish(),
            isReorderable: z
              .boolean()
              .describe('Indicates whether values in the column can be reordered. Read-only.')
              .nullish(),
            isSealed: z
              .boolean()
              .describe('Specifies whether the column can be changed.')
              .nullish(),
            lookup: microsoft_graph_lookupColumn.optional(),
            number: microsoft_graph_numberColumn.optional(),
            personOrGroup: microsoft_graph_personOrGroupColumn.optional(),
            propagateChanges: z
              .boolean()
              .describe(
                "If 'true', changes to this column will be propagated to lists that implement the column."
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/sites/:siteId/lists/:listId/columns/:columnDefinitionId',
    alias: 'delete-sharepoint-list-column',
    description: `Delete navigation property columns for sites`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/lists/:listId/items',
    alias: 'list-sharepoint-site-list-items',
    description: `Get the collection of items in a list.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/sites/:siteId/lists/:listId/items',
    alias: 'create-sharepoint-list-item',
    description: `Create a new listItem in a list.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_listItem,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/lists/:listId/items/:listItemId',
    alias: 'get-sharepoint-site-list-item',
    description: `Returns the metadata for an item in a list.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/sites/:siteId/lists/:listId/items/:listItemId',
    alias: 'update-sharepoint-list-item',
    description: `Update the navigation property items in sites`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_listItem,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/sites/:siteId/lists/:listId/items/:listItemId',
    alias: 'delete-sharepoint-list-item',
    description: `Removes an item from a list.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/onenote/notebooks',
    alias: 'list-sharepoint-site-onenote-notebooks',
    description: `The collection of OneNote notebooks that are owned by the user or group. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/onenote/notebooks/:notebookId/sections',
    alias: 'list-sharepoint-site-onenote-notebook-sections',
    description: `The sections in the notebook. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/onenote/pages/:onenotePageId/content',
    alias: 'get-sharepoint-site-onenote-page-content',
    description: `The page's HTML content.`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/:siteId/onenote/sections/:onenoteSectionId/pages',
    alias: 'list-sharepoint-site-onenote-section-pages',
    description: `The collection of pages in the section.  Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/sites/delta()',
    alias: 'get-sharepoint-sites-delta',
    description: `Get newly created, updated, or deleted sites without having to perform a full read of the entire sites collection. A delta function call for sites is similar to a GET request, except that by appropriately applying state tokens in one or more of these calls,
you can query for incremental changes in the sites. It allows you to maintain and synchronize a local store of a user's sites without having to fetch all the sites from the server every time.
The application calls the API without specifying any parameters.
The service begins enumerating sites and returns pages of changes to these sites, accompanied by either an @odata.nextLink or an @odata.deltaLink.
Your application should continue making calls using the @odata.nextLink until there's an @odata.deltaLink  in the response. After you receive all the changes, you can apply them to your local state.
To monitor future changes, call the delta API by using the @odata.deltaLink in the previous response. Any resources marked as deleted should be removed from your local state.`,
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
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
      {
        name: '$orderby',
        type: 'Query',
        schema: z.array(z.string()).describe('Order items by property values').optional(),
      },
      {
        name: '$expand',
        type: 'Query',
        schema: z.array(z.string()).describe('Expand related entities').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/solutions/virtualEvents/webinars/:virtualEventWebinarId',
    alias: 'get-virtual-event-webinar',
    description: `Read the properties and relationships of a virtualEventWebinar object. All roles can get the details of a webinar event.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/solutions/virtualEvents/webinars/:virtualEventWebinarId/sessions',
    alias: 'list-webinar-sessions',
    description: `Get a list of all virtualEventSession summary objects under a virtual event. A session summary contains only the endDateTime, id, joinWebUrl, startDateTime, and subject of a virtual event session. The rest of session properties will be null. Currently, the following virtual event types are supported: 
- virtualEventTownhall
- virtualEventWebinar`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/subscriptions',
    alias: 'list-subscriptions',
    description: `Retrieve the properties and relationships of webhook subscriptions, based on the app ID, the user, and the user's role with a tenant. The content of the response depends on the context in which the app is calling; for details, see the scenarios in the Permissions section.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/subscriptions',
    alias: 'create-subscription',
    description: `Subscribes a listener application to receive change notifications when the requested type of changes occur to the specified resource in Microsoft Graph. To identify the resources for which you can create subscriptions and the limitations on subscriptions, see Set up notifications for changes in resource data: Supported resources. Some resources support rich notifications, that is, notifications that include resource data. For more information about these resources, see Set up change notifications that include resource data: Supported resources.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New entity`,
        type: 'Body',
        schema: microsoft_graph_subscription,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/subscriptions/:subscriptionId',
    alias: 'get-subscription',
    description: `Retrieve the properties and relationships of a subscription. See the table in the Permissions section for the list of resources that support subscribing to change notifications.`,
    requestFormat: 'json',
    parameters: [
      {
        name: '$select',
        type: 'Query',
        schema: z.array(z.string()).describe('Select properties to be returned').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'patch',
    path: '/subscriptions/:subscriptionId',
    alias: 'update-subscription',
    description: `Renew a subscription by extending its expiry time. The table in the Permissions section lists the resources that support subscribing to change notifications. Subscriptions expire after a length of time that varies by resource type. In order to avoid missing change notifications, an app should renew its subscriptions well in advance of their expiry date. See subscription for maximum length of a subscription for each resource type.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New property values`,
        type: 'Body',
        schema: microsoft_graph_subscription,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/subscriptions/:subscriptionId',
    alias: 'delete-subscription',
    description: `Delete a subscription. For the list of resources that support subscribing to change notifications, see the table in the Permissions section.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/subscriptions/:subscriptionId/reauthorize',
    alias: 'reauthorize-subscription',
    description: `Reauthorize a subscription when you receive a reauthorizationRequired challenge.`,
    requestFormat: 'json',
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId',
    alias: 'get-team',
    description: `Retrieve the properties and relationships of the specified team.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels',
    alias: 'list-team-channels',
    description: `Retrieve the list of channels in this team.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/teams/:teamId/channels',
    alias: 'create-team-channel',
    description: `Create a new channel in a team, as specified in the request body. When you create a channel, the maximum length of the channel's displayName is 50 characters. This is the name that appears to the user in Microsoft Teams. If you're creating a private channel, you can add a maximum of 200 members.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_channel,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels/:channelId',
    alias: 'get-team-channel',
    description: `Retrieve the properties and relationships of a channel. This method supports federation. Only a user who is a member of the shared channel can retrieve channel information.`,
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
    response: z.void()
  },
  {
    method: 'patch',
    path: '/teams/:teamId/channels/:channelId',
    alias: 'update-team-channel',
    description: `Update the properties of the specified channel.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property values`,
        type: 'Body',
        schema: microsoft_graph_channel,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/teams/:teamId/channels/:channelId',
    alias: 'delete-team-channel',
    description: `Delete the channel.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels/:channelId/filesFolder',
    alias: 'get-channel-files-folder',
    description: `Get the metadata for the location where the files of a channel are stored. `,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels/:channelId/messages',
    alias: 'list-channel-messages',
    description: `Retrieve the list of messages (without the replies) in a channel of a team.  To get the replies for a message, call the list message replies or the get message reply API.  This method supports federation. To list channel messages in application context, the request must be made from the tenant that the channel owner belongs to (represented by the tenantId property on the channel).`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/teams/:teamId/channels/:channelId/messages',
    alias: 'send-channel-message',
    description: `Send a new chatMessage in the specified channel.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_chatMessage,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels/:channelId/messages/:chatMessageId',
    alias: 'get-channel-message',
    description: `Retrieve a single message or a message reply in a channel or a chat.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels/:channelId/messages/:chatMessageId/hostedContents',
    alias: 'list-channel-message-hosted-contents',
    description: `Retrieve the list of chatMessageHostedContent objects from a message. This API only lists the hosted content objects. To get the content bytes, see get chatmessage hosted content.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels/:channelId/messages/:chatMessageId/replies',
    alias: 'list-channel-message-replies',
    description: `List all the replies to a message in a channel of a team. This method lists only the replies of the specified message, if any. To get the message itself, call get channel message.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/teams/:teamId/channels/:channelId/messages/:chatMessageId/replies',
    alias: 'reply-to-channel-message',
    description: `Create a new reply to a chatMessage in a specified channel.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_chatMessage,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/teams/:teamId/channels/:channelId/messages/:chatMessageId/setReaction',
    alias: 'set-channel-message-reaction',
    description: `Invoke action setReaction`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ reactionType: z.string().nullable() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/teams/:teamId/channels/:channelId/messages/:chatMessageId/unsetReaction',
    alias: 'unset-channel-message-reaction',
    description: `Invoke action unsetReaction`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: z.object({ reactionType: z.string().nullable() }).partial().passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/channels/:channelId/tabs',
    alias: 'list-channel-tabs',
    description: `Retrieve the list of tabs in the specified channel within a team. `,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/teams/:teamId/members',
    alias: 'list-team-members',
    description: `Get the conversationMember collection of a team. The membership IDs returned by the server must be treated as opaque strings. The client shouldn't try to parse or make assumptions about these resource IDs. In the future, membership results can include users from various tenants, as indicated in the response. Clients should avoid assuming that all members exclusively belong to the current tenant.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/teams/:teamId/members',
    alias: 'add-team-member',
    description: `Add a new conversationMember to a team.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: microsoft_graph_conversationMember,
      },
    ],
    response: z.void()
  },
  {
    method: 'delete',
    path: '/teams/:teamId/members/:conversationMemberId',
    alias: 'remove-team-member',
    description: `Remove a conversationMember from a team.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'If-Match',
        type: 'Header',
        schema: z.string().describe('ETag').optional(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/users',
    alias: 'list-users',
    description: `Retrieve a list of user objects.`,
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
        name: '$top',
        type: 'Query',
        schema: z.number().int().gte(0).describe('Show only the first n items').optional(),
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/calendar/events',
    alias: 'list-shared-calendar-events',
    description: `The events in the calendar. Navigation property. Read-only.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/calendarView',
    alias: 'get-shared-calendar-view',
    description: `The calendar view for the calendar. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/directReports',
    alias: 'list-user-direct-reports',
    description: `Get an agentUser's direct reports. Returns the users and contacts for whom this agent user is assigned as manager.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/mailFolders/:mailFolderId/messages',
    alias: 'list-shared-mailbox-folder-messages',
    description: `The collection of messages in the mailFolder.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/manager',
    alias: 'get-user-manager',
    description: `Returns the user or organizational contact assigned as the agentUser's manager.`,
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
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/messages',
    alias: 'list-shared-mailbox-messages',
    description: `The messages in a mailbox or folder. Read-only. Nullable.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/users/:userId/messages',
    alias: 'create-shared-mailbox-draft',
    description: `Create new navigation property to messages for users`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `New navigation property`,
        type: 'Body',
        schema: z
          .object({
            id: z.string().describe('The unique identifier for an entity. Read-only.').optional(),
            createdDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            lastModifiedDateTime: z
              .string()
              .regex(
                /^[0-9]{4,}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,12})?(Z|[+-][0-9][0-9]:[0-9][0-9])$/
              )
              .datetime({ offset: true })
              .describe(
                'The Timestamp type represents date and time information using ISO 8601 format and is always in UTC time. For example, midnight UTC on Jan 1, 2014 is 2014-01-01T00:00:00Z'
              )
              .nullish(),
            body: microsoft_graph_itemBody.optional(),
            subject: z.string().describe('The subject of the message.').nullish(),
            attachments: z
              .array(microsoft_graph_attachment)
              .describe('The fileAttachment and itemAttachment attachments for the message.')
              .optional(),
            singleValueExtendedProperties: z
              .array(microsoft_graph_singleValueLegacyExtendedProperty)
              .describe(
                'The collection of single-value extended properties defined for the message. Nullable.'
              )
              .optional(),
            multiValueExtendedProperties: z
              .array(microsoft_graph_multiValueLegacyExtendedProperty)
              .describe(
                'The collection of multi-value extended properties defined for the message. Nullable.'
              )
              .optional(),
            importance: microsoft_graph_importance.optional(),
            from: microsoft_graph_recipient.optional(),
            toRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The To: recipients for the message.')
              .optional(),
            categories: z
              .array(z.string().nullable())
              .describe('The categories associated with the item')
              .optional(),
            changeKey: z
              .string()
              .describe(
                'Identifies the version of the item. Every time the item is changed, changeKey changes as well. This allows Exchange to apply changes to the correct version of the object. Read-only.'
              )
              .nullish(),
            bccRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The Bcc: recipients for the message.')
              .optional(),
            bodyPreview: z
              .string()
              .describe('The first 255 characters of the message body. It is in text format.')
              .nullish(),
            ccRecipients: z
              .array(microsoft_graph_recipient)
              .describe('The Cc: recipients for the message.')
              .optional(),
            conversationId: z
              .string()
              .describe('The ID of the conversation the email belongs to.')
              .nullish(),
            conversationIndex: z
              .string()
              .describe('Indicates the position of the message within the conversation.')
              .nullish(),
            flag: microsoft_graph_followupFlag.optional(),
            hasAttachments: z
              .boolean()
              .describe(
                "Indicates whether the message has attachments. This property doesn't include inline attachments, so if a message contains only inline attachments, this property is false. To verify the existence of inline attachments, parse the body property to look for a src attribute, such as <IMG src='cid:image001.jpg@01D26CD8.6C05F070'>."
              )
              .nullish(),
            inferenceClassification: microsoft_graph_inferenceClassificationType.optional(),
            internetMessageHeaders: z
              .array(microsoft_graph_internetMessageHeader)
              .describe(
                'A collection of message headers defined by RFC5322. The set includes message headers indicating the network path taken by a message from the sender to the recipient. It can also contain custom message headers that hold app data for the message.  Requires $select to retrieve. Read-only.'
              )
              .optional(),
            internetMessageId: z
              .string()
              .describe('The message ID in the format specified by RFC2822.')
              .nullish(),
            isDeliveryReceiptRequested: z
              .boolean()
              .describe('Indicates whether a read receipt is requested for the message.')
              .nullish(),
            isDraft: z
              .boolean()
              .describe(
                "Indicates whether the message is a draft. A message is a draft if it hasn't been sent yet."
              )
              .nullish(),
          })
          .passthrough()
          .passthrough(),
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/messages/:messageId',
    alias: 'get-shared-mailbox-message',
    description: `The messages in a mailbox or folder. Read-only. Nullable.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'includeHiddenMessages',
        type: 'Query',
        schema: z.string().describe('Include Hidden Messages').optional(),
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/users/:userId/messages/:messageId/forward',
    alias: 'forward-shared-mailbox-mail',
    description: `Forward a message using either JSON or MIME format. When using JSON format, you can:
- Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
- Specify either the toRecipients parameter or the toRecipients property of the message parameter. Specifying both or specifying neither will return an HTTP 400 Bad Request error. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. This method saves the message in the Sent Items folder. Alternatively, create a draft to forward a message, and send it later.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_forward_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/users/:userId/messages/:messageId/reply',
    alias: 'reply-shared-mailbox-mail',
    description: `Reply to the sender of a message using either JSON or MIME format. When using JSON format:
* Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
* If the original message specifies a recipient in the replyTo property, per Internet Message Format (RFC 2822), send the reply to the recipients in replyTo and not the recipient in the from property. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. This method saves the message in the Sent Items folder. Alternatively, create a draft to reply to an existing message and send it later.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_reply_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'post',
    path: '/users/:userId/messages/:messageId/replyAll',
    alias: 'reply-all-shared-mailbox-mail',
    description: `Reply to all recipients of a message using either JSON or MIME format. When using JSON format:
- Specify either a comment or the body property of the message parameter. Specifying both will return an HTTP 400 Bad Request error.
- If the original message specifies a recipient in the replyTo property, per Internet Message Format (RFC 2822), send the reply to the recipients in replyTo and not the recipient in the from property. When using MIME format:
- Provide the applicable Internet message headers and the MIME content, all encoded in base64 format in the request body.
- Add any attachments and S/MIME properties to the MIME content. This method saves the message in the Sent Items folder. Alternatively, create a draft to reply-all to a message and send it later.`,
    requestFormat: 'json',
    parameters: [
      {
        name: 'body',
        description: `Action parameters`,
        type: 'Body',
        schema: create_reply_draft_Body,
      },
    ],
    response: z.void()
  },
  {
    method: 'get',
    path: '/users/:userId/presence',
    alias: 'get-user-presence',
    description: `Get a user's presence information.`,
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
    response: z.void()
  },
  {
    method: 'post',
    path: '/users/:userId/sendMail',
    alias: 'send-shared-mailbox-mail',
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
    response: z.void()
  },
]);

export const api = new Zodios(endpoints);

export function createApiClient(baseUrl: string, options?: ZodiosOptions) {
  return new Zodios(baseUrl, endpoints, options);
}
