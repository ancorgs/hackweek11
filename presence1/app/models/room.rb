class Room < ActiveRecord::Base
  has_many :users, inverse_of: :room
end
