export enum User_Notif_Type {
  // ---------------- Nhóm ----------------
  /** Có post mới trong nhóm -> click vào post */
  NEW_POST = 'NEW_POST',
  /** Bài làm của bạn đã được chấm -> click vào post */
  GRADED_POST = 'GRADED_POST',
  /** Có người xin vào nhóm -> gửi cho founder + admin */
  GROUP_JOIN_REQUEST = 'GROUP_JOIN_REQUEST',
  /** Đơn xin vào nhóm được duyệt -> click vào group */
  GROUP_JOIN_APPROVED = 'GROUP_JOIN_APPROVED',
  /** Đơn xin vào nhóm bị từ chối -> click vào group */
  GROUP_JOIN_REJECTED = 'GROUP_JOIN_REJECTED',
  /** Bị đuổi khỏi nhóm */
  GROUP_MEMBER_KICKED = 'GROUP_MEMBER_KICKED',
  /** Được phong / bị hạ phó nhóm */
  GROUP_MEMBER_ROLE_CHANGED = 'GROUP_MEMBER_ROLE_CHANGED',

  // ---------------- Bạn bè ----------------
  /** Có lời mời kết bạn */
  FRIEND_REQUEST = 'FRIEND_REQUEST',
  /** Lời mời kết bạn được chấp nhận / bị từ chối */
  FRIEND_RESPONSE = 'FRIEND_RESPONSE',

  // ---------------- Khác ----------------
  /** Giáo viên chấm bài của bạn (dùng chung với GRADED_POST cho tương thích cũ) */
  SUBMISSION = 'SUBMISSION',
  /** Báo cáo của bạn đã được xử lý */
  REPORT_RESOLVED = 'REPORT_RESOLVED',
  /** Báo cáo vi phạm mới (gửi cho admin) */
  REPORT = 'REPORT',
  /** Thông báo hệ thống */
  SYSTEM = 'SYSTEM',
}
