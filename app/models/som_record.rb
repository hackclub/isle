class SoMRecord < ActiveRecord::Base
  self.abstract_class = true
  connects_to database: { reading: :som, writing: :som }
end