class RoomsController < ApplicationController
  def show
    @room = Room.includes(:users).find_by(name: params[:id])

    respond_to do |format|
      user_id = session[:current_user_id]
      if user_id.blank? || User.where(id: user_id).empty?
        format.html { redirect_to new_room_user_path(@room.name) }
        format.json { render status: :unprocessable_entity }
      else
        format.html { render }
        # FIXME the json logic should probably be moved to a template
        format.json {
          # Remove the picture if it has not changed
          unless params[:newer_than].blank?
            @room.users.each do |u|
              u.last_pic = '' if u.updated_at.to_i <= params[:newer_than].to_i
            end
          end
          result = @room.as_json(include: :users)
          result['timestamp'] = @room.users.map {|u| u.updated_at }.max.to_i
          render json: result
        }
      end
    end
  end
end
