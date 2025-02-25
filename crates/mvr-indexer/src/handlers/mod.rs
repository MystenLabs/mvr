use sui_types::object::Object;

pub mod git_info_handler;
pub mod name_record_handler;
pub mod package_handler;
pub mod package_info_handler;

pub trait MoveObjectProcessor<T, R> {
    const PROC_NAME: &'static str;
    fn process_move_object(chain_id: String, move_obj: T, obj: &Object)
        -> Result<R, anyhow::Error>;
}
