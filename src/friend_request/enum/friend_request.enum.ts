import { UpdateRequestFromReceiverDto } from '../dto/friend_request.dto.js';

export enum Friend_Request_Status {
  PENDING = 'PENDING',
  REJECTED = 'REJECTED',
  ACCEPTED = 'ACCEPTED',
  SELF_CANCELLED = 'SELF_CANCELLED',
}

export enum UpdateRequestFromSenderEnum {
  SELF_CANCELLED = 'SELF_CANCELLED',
}

export enum UpdateRequestFromReceiverEnum {
  REJECTED = 'REJECTED',
  ACCEPTED = 'ACCEPTED',
}