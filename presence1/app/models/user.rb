class User < ActiveRecord::Base
  belongs_to :room, inverse_of: :users

  validate :room, presence: true
end
