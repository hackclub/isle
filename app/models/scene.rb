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
  belongs_to :user
end
