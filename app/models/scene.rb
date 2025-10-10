# == Schema Information
#
# Table name: scenes
#
#  id          :bigint           not null, primary key
#  connections :integer          default([]), is an Array
#  description :text
#  name        :string
#  thread_ts   :string
#  thread_url  :string
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

  # Returns the public URL where this scene is hosted.
  # By default this is <pages_base_url>/scenes/:id/
  # You can override the path for individual scenes by adding a mapping
  # in Rails credentials under `github: { scene_overrides: { "49": "some/path/" } }`
  # or by setting ENV["GITHUB_SCENE_OVERRIDES"] to a JSON string like
  # '{"49":"special/scenes/49/"}'. If the override value is an absolute URL
  # (starts with http/https) it will be returned directly.
  def live_url
    base = Rails.application.credentials.github&.dig(:pages_base_url) || ENV["GITHUB_PAGES_BASE_URL"] || ""

  # Quick hardcoded special-case: serve scene 49 from public/webgame
  return "#{base}public/webgame/" if id == 49

  # Load overrides from credentials first, then ENV
    raw_overrides = Rails.application.credentials.github&.dig(:scene_overrides) || ENV["GITHUB_SCENE_OVERRIDES"]

    mapping = case raw_overrides
              when Hash
                raw_overrides
              when String
                begin
                  JSON.parse(raw_overrides)
                rescue StandardError
                  {}
                end
              else
                {}
              end

    # Support numeric, string, or symbol keys
    override = mapping[id] || mapping[id.to_s] || mapping[id.to_sym]

    if override.present?
      return override.start_with?("http://", "https://") ? override : "#{base}#{override}"
    end

    "#{base}scenes/#{id}/"
  end

  def claim!(user)
    update!(user:)
    reply_in_thread(text: "*#{name}* now belongs to _<@#{user.slack_id}>_!")
  end

  def unclaim! = update!(user: nil)

  def claimed? = user.present?

  def slack_thread_url
    if thread_url.present?
      thread_url
    elsif thread_ts.present?
      "https://hackclub.slack.com/archives/#{SlackService::CHAN}/p#{thread_ts.sub(".", "")}"
    end
  end

  private

  def reply_in_thread(options = {}) = SlackService.poast(options.merge(thread_ts:))
end
