import sys
import os
import pymysql
from dotenv import load_dotenv


def main():
    if len(sys.argv) < 2:
        print("用法: python scripts/delete_puzzles_cascade.py <title1> [title2] [title3] ...")
        sys.exit(1)
    
    titles = sys.argv[1:]
    print(f"准备删除关卡: {', '.join(titles)}")

    # 读取 .env
    load_dotenv()
    host = os.getenv("MYSQL_HOST")
    user = os.getenv("MYSQL_USER")
    password = os.getenv("MYSQL_PASSWORD")
    dbname = os.getenv("MYSQL_DB")
    port = int(os.getenv("MYSQL_PORT") or "3306")

    if not all([host, user, password, dbname]):
        print("环境变量不完整，请检查 .env 中的 MYSQL_HOST/MYSQL_USER/MYSQL_PASSWORD/MYSQL_DB/MYSQL_PORT")
        sys.exit(1)

    # 连接 MySQL
    conn = pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=dbname,
        port=port,
        charset="utf8mb4",
        autocommit=False,
        cursorclass=pymysql.cursors.DictCursor,
    )
    try:
        with conn.cursor() as cur:
            # 先查询要删除的关卡
            print("查询待删除关卡...")
            placeholders = ','.join(['%s'] * len(titles))
            cur.execute(
                f"SELECT puzzle_id, title, image_url, is_system_level FROM puzzles "
                f"WHERE title IN ({placeholders})",
                titles
            )
            puzzle_rows = cur.fetchall()
            
            if not puzzle_rows:
                print("未找到匹配的关卡。")
                return
            
            print(f"找到 {len(puzzle_rows)} 个关卡：")
            puzzle_ids = []
            for r in puzzle_rows:
                print(f"  ID: {r['puzzle_id']}, 标题: {r['title']}, 系统关卡: {r['is_system_level']}")
                puzzle_ids.append(r['puzzle_id'])
            
            # 查询相关的存档记录
            if puzzle_ids:
                progress_placeholders = ','.join(['%s'] * len(puzzle_ids))
                cur.execute(
                    f"SELECT COUNT(*) AS cnt FROM puzzle_progress WHERE puzzle_id IN ({progress_placeholders})",
                    puzzle_ids
                )
                progress_count = cur.fetchone()["cnt"]
                print(f"相关存档记录数: {progress_count}")
            
            # 确认删除
            confirm = input("确认删除这些关卡及相关存档吗？(y/N): ")
            if confirm.lower() != 'y':
                print("取消删除操作。")
                return
            
            # 先删除存档记录
            if puzzle_ids and progress_count > 0:
                print("删除相关存档记录...")
                cur.execute(
                    f"DELETE FROM puzzle_progress WHERE puzzle_id IN ({progress_placeholders})",
                    puzzle_ids
                )
                progress_deleted = cur.rowcount
                print(f"删除存档记录数: {progress_deleted}")
            
            # 删除关卡
            print("删除关卡...")
            cur.execute(
                f"DELETE FROM puzzles WHERE title IN ({placeholders})",
                titles
            )
            puzzles_deleted = cur.rowcount
            conn.commit()
            print(f"删除完成，关卡数: {puzzles_deleted}")
            
            # 验证
            cur.execute(
                f"SELECT COUNT(*) AS cnt FROM puzzles WHERE title IN ({placeholders})",
                titles
            )
            left = cur.fetchone()["cnt"]
            print(f"删除后剩余匹配关卡数: {left}")

    except Exception as e:
        conn.rollback()
        print("删除失败，已回滚：", str(e))
        sys.exit(1)
    finally:
        conn.close()


if __name__ == "__main__":
    main()
