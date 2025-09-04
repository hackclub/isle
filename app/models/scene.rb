# == Schema Information
#
# Table name: scenes
#
#  id          :bigint           not null, primary key
#  connections :integer          default([]), is an Array
#  description :text
#  name        :string
#  thread_ts   :string
#  x           :decimal(, )
#  y           :decimal(, )
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#  user_id     :bigint
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
      *<https://summer.hackclub.com/s?scene=#{id}|#{name}>* _(Scene #{id})_
      >#{description}
    EOT

    res = SlackService.poast(text:, unfurl_links: false, unfurl_media: false)
    update!(thread_ts: res["ts"])
    reply_in_thread(text: "🧵...")
  end

  def live_url = "#{Rails.application.credentials.github.pages_base_url}scenes/#{id}/"

  def claim!(user)
    update!(user:)
    reply_in_thread(text: "*#{name}* now belongs to _<@#{user.slack_id}>_!")
  end

  def unclaim! = update!(user: nil)

  def claimed? = user.present?

  def slack_thread_url
    thread_ts.present? && "https://hackclub.slack.com/archives/#{SlackService::CHAN}/p#{thread_ts.sub(".", "")}"
  end

  private

  def reply_in_thread(options = {}) = SlackService.poast(options.merge(thread_ts:))
end
