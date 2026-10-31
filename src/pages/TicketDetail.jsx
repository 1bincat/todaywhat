import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Ticket from "../components/Ticket";
import ConfirmModal from "../components/ConfirmModal";
import { deleteTicket, fetchTicket, photoSrc, saveJourney } from "../api/tickets";
import "./TicketDetail.css";

const IMG_OK = /^image\/(jpeg|png|webp|gif)$/;

const todayStr = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [visitedAt, setVisitedAt] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [base, setBase] = useState(null); // 서버에 저장된 값 (수정 여부 비교용)
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState(null); // 확인 모달: 'leave' | 'delete'

  useEffect(() => {
    fetchTicket(id)
      .then((data) => {
        setItem(data);
        const j = data.journey;
        setRating(j?.rating ?? 0);
        setReview(j?.review ?? "");
        setVisitedAt(j?.visitedAt ?? "");
        setPreview(j?.photoUrl ? photoSrc(j.photoUrl) : null);
        setBase({
          rating: j?.rating ?? 0,
          review: j?.review ?? "",
          visitedAt: j?.visitedAt ?? "",
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // 저장하지 않은 수정사항이 있는지
  const dirty =
    base !== null &&
    (rating !== base.rating ||
      review.trim() !== base.review.trim() ||
      visitedAt !== base.visitedAt ||
      photoFile !== null ||
      removePhoto);

  // 새로고침/탭 닫기 전에 브라우저 기본 경고
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // 토스트 메시지는 잠깐 보였다가 사라짐
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2600);
    return () => clearTimeout(t);
  }, [msg]);

  const revoke = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
  };

  const onPickPhoto = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!IMG_OK.test(file.type)) return setMsg("jpg, png, webp, gif 이미지만 올릴 수 있어요.");
    if (file.size > 5 * 1024 * 1024) return setMsg("사진은 5MB 이하만 올릴 수 있어요.");
    revoke();
    setPhotoFile(file);
    setPreview(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const onRemovePhoto = () => {
    revoke();
    setPhotoFile(null);
    setPreview(null);
    setRemovePhoto(Boolean(item?.journey?.photoUrl)); // 서버에 사진이 있을 때만 삭제 표시
  };

  // 기록 저장 (성공하면 true)
  const persist = async () => {
    setSaving(true);
    setMsg("");
    try {
      const j = await saveJourney(id, { rating, review, visitedAt, photo: photoFile, removePhoto });
      revoke();
      setItem((it) => ({ ...it, journey: j }));
      setBase({
        rating: j.rating ?? 0,
        review: j.review ?? "",
        visitedAt: j.visitedAt ?? "",
      });
      setPhotoFile(null);
      setRemovePhoto(false);
      setPreview(j.photoUrl ? photoSrc(j.photoUrl) : null);
      return true;
    } catch (e) {
      setMsg(e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (await persist()) setMsg("기록이 저장되었어요 ✓");
  };

  // 오른쪽 위 완료: 수정사항이 있으면 저장하고 이전 화면으로
  const onDone = async () => {
    if (saving) return;
    if (dirty && !(await persist())) return;
    navigate(-1);
  };

  // 왼쪽 위 뒤로가기: 수정사항이 있으면 확인 모달
  const onBack = () => {
    if (dirty) setAsk("leave");
    else navigate(-1);
  };

  const onDelete = async () => {
    setAsk(null);
    try {
      await deleteTicket(id);
      navigate("/journey", { replace: true });
    } catch (e) {
      setMsg(e.message);
    }
  };

  if (loading) return <div className="td-center">불러오는 중...</div>;

  if (error || !item) {
    return (
      <div className="td-center">
        <p>{error || "티켓을 찾을 수 없어요."}</p>
        <button
          className="td-save"
          style={{ width: "auto", padding: "10px 24px" }}
          onClick={() => navigate("/journey")}
        >
          내 기록으로
        </button>
      </div>
    );
  }

  return (
    <div className="td-page">
      <header className="td-header">
        <button className="td-back" onClick={onBack} aria-label="뒤로가기">
          ←
        </button>
        <h1>저장한 티켓</h1>
        <button className={dirty ? "td-done on" : "td-done"} onClick={onDone} disabled={saving}>
          {saving ? "저장 중..." : "완료"}
        </button>
      </header>

      <div className="td-ticket">
        <Ticket {...item.ticket} />
      </div>

      {item.ticket.type === "travel" && (
        <button
          className="td-around"
          onClick={() => navigate("/around", { state: { ticket: item.ticket } })}
        >
          🔎 {item.ticket.place} 주변에서 뭐 할까?
        </button>
      )}

      <section className="td-record">
        <small>MY RECORD</small>

        <div className="td-field">
          <label>별점</label>
          <div className="td-stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={n <= rating ? "td-star on" : "td-star"}
                onClick={() => setRating(n === rating ? 0 : n)}
                aria-label={`${n}점`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="td-field">
          <label htmlFor="td-date">다녀온 날</label>
          <input
            id="td-date"
            className="td-input"
            type="date"
            max={todayStr()}
            value={visitedAt}
            onChange={(e) => setVisitedAt(e.target.value)}
          />
        </div>

        <div className="td-field">
          <label htmlFor="td-review">후기</label>
          <textarea
            id="td-review"
            className="td-textarea"
            placeholder="어떤 하루였나요? 짧게 남겨보세요"
            maxLength={2000}
            value={review}
            onChange={(e) => setReview(e.target.value)}
          />
        </div>

        <div className="td-field">
          <label>사진</label>
          {preview && <img className="td-photo-preview" src={preview} alt="기록 사진" />}
          <div className="td-photo-actions">
            <label className="td-photo-btn">
              {preview ? "사진 바꾸기" : "📷 사진 올리기"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={onPickPhoto}
              />
            </label>
            {preview && (
              <button type="button" className="td-photo-btn" onClick={onRemovePhoto}>
                사진 지우기
              </button>
            )}
          </div>
        </div>

        {dirty && <p className="td-dirty">저장되지 않은 변경사항이 있어요</p>}

        <button className="td-save" onClick={onSave} disabled={saving}>
          {saving ? "저장 중..." : item.journey ? "기록 수정하기" : "기록 남기기"}
        </button>
      </section>

      <button className="td-delete" onClick={() => setAsk("delete")}>
        이 티켓 삭제하기
      </button>

      {msg && <div className="td-toast">{msg}</div>}

      {/* 수정사항이 있는 채로 나가려 할 때 */}
      <ConfirmModal
        open={ask === "leave"}
        icon="✏️"
        title="저장하지 않은 수정사항이 있어요"
        message="지금 나가면 수정한 내용이 사라져요. 어떻게 할까요?"
        onClose={() => setAsk(null)}
        buttons={[
          {
            label: "저장하고 나가기",
            variant: "primary",
            onClick: async () => {
              setAsk(null);
              if (await persist()) navigate(-1);
            },
          },
          {
            label: "저장 안 하고 나가기",
            variant: "danger",
            onClick: () => {
              setAsk(null);
              navigate(-1);
            },
          },
          { label: "계속 수정하기", variant: "text", onClick: () => setAsk(null) },
        ]}
      />

      {/* 티켓 삭제 확인 */}
      <ConfirmModal
        open={ask === "delete"}
        icon="🗑️"
        title="티켓을 삭제할까요?"
        message="남겨 둔 기록(별점·후기·사진)도 함께 삭제돼요. 되돌릴 수 없어요."
        onClose={() => setAsk(null)}
        buttons={[
          { label: "취소", variant: "secondary", onClick: () => setAsk(null) },
          { label: "삭제하기", variant: "danger", onClick: onDelete },
        ]}
      />
    </div>
  );
}