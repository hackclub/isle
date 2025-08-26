# == Schema Information
#
# Table name: scenes
#
#  id         :bigint           not null, primary key
#  name       :string
#  thread_ts  :string
#  x          :decimal(, )
#  y          :decimal(, )
#  created_at :datetime         not null
#  updated_at :datetime         not null
#  user_id    :bigint
#
# Indexes
#
#  index_scenes_on_user_id  (user_id)
#
class Scene < ApplicationRecord
  belongs_to :user, optional: true

  scope :unposted, -> { where(thread_ts: nil) }
  scope :unclaimed, -> { where(user_id: nil) }
  scope :claimed, -> { where.not(user_id: nil) }

  def post_to_slack!
    text = <<~EOT
      this thread would be a great place to talk about *#{name}*!
    EOT

    res = SlackService.poast(text:)
    update!(thread_ts: res["ts"])
  end

  def claim!(user)
    update!(user:)
  end

  def claimed? = user.present?

  private

  def reply_in_thread(options = {}) = SlackService.poast(options.merge(thread_ts:))
end
